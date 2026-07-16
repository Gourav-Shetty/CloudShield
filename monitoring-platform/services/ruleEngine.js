const Alert = require('../models/Alert');
const incidentResponse = require('./incidentResponse');

/* ------------------------------------------------------------------ */
/*  In-memory tracking maps                                           */
/* ------------------------------------------------------------------ */

/** @type {Map<string, Array<{timestamp: number, success: boolean}>>} */
const loginAttempts = new Map();

/** @type {Map<string, Array<{timestamp: number}>>} */
const requestCounts = new Map();

/** @type {Map<string, Set<string>>} */
const notFoundCounts = new Map();

/** @type {Map<string, number>} */
const postCaptchaFailures = new Map();

/* ------------------------------------------------------------------ */
/*  Periodic cleanup — evict entries older than 60 s every 30 s       */
/* ------------------------------------------------------------------ */

const WINDOW_MS = 60_000; // 60 seconds

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;

  for (const [ip, attempts] of loginAttempts) {
    const filtered = attempts.filter((a) => a.timestamp > cutoff);
    if (filtered.length === 0) loginAttempts.delete(ip);
    else loginAttempts.set(ip, filtered);
  }

  for (const [ip, reqs] of requestCounts) {
    const filtered = reqs.filter((r) => r.timestamp > cutoff);
    if (filtered.length === 0) requestCounts.delete(ip);
    else requestCounts.set(ip, filtered);
  }

  for (const [ip] of notFoundCounts) {
    notFoundCounts.delete(ip);
  }
}, 30_000);

/* ------------------------------------------------------------------ */
/*  Refined WAF Regex patterns                                        */
/* ------------------------------------------------------------------ */

const SQL_INJECTION_RE =
  /(UNION\s+(ALL\s+)?SELECT|SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+|AND\s+['"]?\d+['"]?\s*=\s*['"]?\d+|--|#|\/\*|\*\/|xp_cmdshell|exec\s*\(|benchmark\s*\(|sleep\s*\()/i;

const XSS_RE =
  /(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|onclick\s*=|onmouseover\s*=|onfocus\s*=|onblur\s*=|onchange\s*=|onkeydown\s*=|onkeyup\s*=|onkeypress\s*=|alert\s*\(|prompt\s*\(|confirm\s*\(|eval\s*\(|document\.cookie|document\.write|<iframe|<object|<embed|<svg)/i;

const DIR_TRAVERSAL_RE =
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|\.\.%2f|\/etc\/passwd|win\.ini|boot\.ini)/i;

const PORT_SCAN_RE =
  /(nmap|nikto|sqlmap|dirbuster|gobuster|masscan|w3af|hydra|acunetix|nessus)/i;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function deepStringify(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return String(obj);
  return Object.values(obj).map(deepStringify).join(' ');
}

/**
 * Persist an alert, broadcast it, and escalate to incidentResponse.
 */
async function createAlert(alertData, io) {
  try {
    const alert = await Alert.create(alertData);

    // Broadcast to all connected dashboard clients
    if (io) {
      io.emit('new-alert', alert);
    }

    // Escalate critical alerts to the incident response engine
    if (alertData.severity === 'Critical') {
      await incidentResponse.handleIncident(alert, io, null);
    }

    return alert;
  } catch (err) {
    console.error('[RuleEngine] Failed to create alert:', err.message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Main analysis function                                             */
/* ------------------------------------------------------------------ */

/**
 * Analyze an incoming log entry against all security rules.
 *
 * @param {Object} logData  – the log document (plain object)
 * @param {Object} io       – Socket.IO server instance
 * @returns {Object|null}   – the created Alert document, or null
 */
async function analyzeLog(logData, io) {
  const { ip, endpoint = '', status, eventType, payload = {} } = logData;
  const now = Date.now();

  /* ---------- Rule 1: Brute Force ---------- */
  if (eventType === 'Login' && status >= 400) {
    if (!loginAttempts.has(ip)) loginAttempts.set(ip, []);
    loginAttempts.get(ip).push({ timestamp: now, success: false });

    const cutoff = now - WINDOW_MS;
    const recent = loginAttempts.get(ip).filter((a) => a.timestamp > cutoff);
    loginAttempts.set(ip, recent);

    // Check if the IP is already under a CAPTCHA quarantine
    const BlockedIp = require('../models/BlockedIp');
    const activeBlock = await BlockedIp.findOne({ ip, isActive: true });

    if (activeBlock && activeBlock.restrictionType === 'Captcha') {
      const failures = (postCaptchaFailures.get(ip) || 0) + 1;
      postCaptchaFailures.set(ip, failures);
      console.log(`[RuleEngine] Failed login attempt under CAPTCHA quarantine from ${ip}. Failures: ${failures}/2`);

      if (failures >= 2) {
        postCaptchaFailures.delete(ip);
        console.log(`[RuleEngine] Escalating quarantine for ${ip} to hard Block due to repeated failures!`);
        
        // Deactivate the CAPTCHA block
        activeBlock.isActive = false;
        await activeBlock.save();

        // Create a new CRITICAL alert representing the escalation
        return createAlert(
          {
            severity: 'Critical',
            attackType: 'BruteForce',
            sourceIP: ip,
            description: `Brute-force escalation: repeated failures under CAPTCHA quarantine from ${ip}`,
            details: { failedAttempts: recent.length, escalated: true, username: payload.username },
          },
          io
        );
      }
    } else if (recent.length > 5) {
      // Prevent duplicate BruteForce alerts within the 60-second window
      const cutoffDate = new Date(Date.now() - 60_000);
      const existingAlert = await Alert.findOne({
        sourceIP: ip,
        attackType: 'BruteForce',
        createdAt: { $gte: cutoffDate }
      });
      if (existingAlert) {
        return null;
      }

      return createAlert(
        {
          severity: 'Critical',
          attackType: 'BruteForce',
          sourceIP: ip,
          description: `Brute-force detected: ${recent.length} failed logins in 60 s from ${ip}`,
          details: { failedAttempts: recent.length, window: '60s' },
        },
        io,
      );
    }
  }

  /* ---------- Rule 2: SQL Injection ---------- */
  const sqlTarget = endpoint + JSON.stringify(payload);
  if (SQL_INJECTION_RE.test(sqlTarget)) {
    return createAlert(
      {
        severity: 'Critical',
        attackType: 'SQLInjection',
        sourceIP: ip,
        description: `SQL Injection attempt detected from ${ip} on ${endpoint}`,
        details: { endpoint, payloadSnippet: sqlTarget.substring(0, 500), username: payload.username },
      },
      io,
    );
  }

  /* ---------- Rule 3: XSS ---------- */
  const payloadString = deepStringify(payload);
  if (XSS_RE.test(payloadString)) {
    return createAlert(
      {
        severity: 'Critical',
        attackType: 'XSS',
        sourceIP: ip,
        description: `XSS attempt detected from ${ip} on ${endpoint}`,
        details: { endpoint, payloadSnippet: payloadString.substring(0, 500), username: payload.username },
      },
      io,
    );
  }

  /* ---------- Rule 4: Directory Traversal ---------- */
  if (DIR_TRAVERSAL_RE.test(endpoint)) {
    return createAlert(
      {
        severity: 'Critical',
        attackType: 'DirectoryTraversal',
        sourceIP: ip,
        description: `Directory traversal attempt from ${ip}: ${endpoint}`,
        details: { endpoint, username: payload.username },
      },
      io,
    );
  }

  /* ---------- Rule 5: Enumeration (many unique 404s) ---------- */
  if (status === 404) {
    if (!notFoundCounts.has(ip)) notFoundCounts.set(ip, new Set());
    notFoundCounts.get(ip).add(endpoint);

    if (notFoundCounts.get(ip).size > 10) {
      return createAlert(
        {
          severity: 'Critical',
          attackType: 'Enumeration',
          sourceIP: ip,
          description: `Resource enumeration scan from ${ip}: 10+ unique 404 endpoints visited`,
          details: { unique404s: notFoundCounts.get(ip).size, window: '60s' },
        },
        io,
      );
    }
  }

  /* ---------- Rule 6: HTTP Flood ---------- */
  if (!requestCounts.has(ip)) requestCounts.set(ip, []);
  requestCounts.get(ip).push({ timestamp: now });

  const cutoff = now - WINDOW_MS;
  const recentReqs = requestCounts.get(ip).filter((r) => r.timestamp > cutoff);
  requestCounts.set(ip, recentReqs);

  if (recentReqs.length > 100) {
    // Prevent duplicate HTTPFlood alerts within the 60-second window
    const cutoffDate = new Date(Date.now() - 60_000);
    const existingAlert = await Alert.findOne({
      sourceIP: ip,
      attackType: 'HTTPFlood',
      createdAt: { $gte: cutoffDate }
    });

    if (existingAlert) {
      return null;
    }

    return createAlert(
      {
        severity: 'Critical',
        attackType: 'HTTPFlood',
        sourceIP: ip,
        description: `HTTP flood from ${ip}: ${recentReqs.length} requests in 60 s`,
        details: { requestCount: recentReqs.length, window: '60s', username: payload.username },
      },
      io,
    );
  }

  /* ---------- Rule 7: Port Scan / Scanner Detection ---------- */
  const ua = logData.userAgent || '';
  if (PORT_SCAN_RE.test(ua)) {
    return createAlert(
      {
        severity: 'Critical',
        attackType: 'PortScan',
        sourceIP: ip,
        description: `Vulnerability scanner / port scan simulation detected from ${ip} (UA: ${ua})`,
        details: { userAgent: ua, username: payload.username },
      },
      io,
    );
  }

  return null;
}

module.exports = { analyzeLog };
