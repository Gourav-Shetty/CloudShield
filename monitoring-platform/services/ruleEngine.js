const Alert = require('../models/Alert');
const Anomaly = require('../models/Anomaly');
const axios = require('axios');
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

  // notFoundCounts tracks unique endpoints per window — reset entirely
  // on each cleanup cycle so the set doesn't grow forever.
  for (const [ip] of notFoundCounts) {
    notFoundCounts.delete(ip);
  }
}, 30_000);

/* ------------------------------------------------------------------ */
/*  Regex patterns                                                     */
/* ------------------------------------------------------------------ */

const SQL_INJECTION_RE =
  /('|--|;|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|OR\s+1\s*=\s*1|AND\s+1\s*=\s*1|EXEC|EXECUTE|xp_|0x[0-9a-fA-F]+)/i;

const XSS_RE =
  /(<script|javascript:|onerror\s*=|onload\s*=|onclick\s*=|<img\s+src|<svg|<iframe|alert\s*\(|document\.|eval\s*\()/i;

const DIR_TRAVERSAL_RE =
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\|\.\.%2f)/i;

const PORT_SCAN_RE =
  /(nmap|nikto|sqlmap|dirbuster|gobuster|masscan|w3af|hydra|acunetix|nessus)/i;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Recursively stringify all values in an object to produce a single
 * searchable string (used for XSS payload inspection).
 */
function deepStringify(obj) {
  if (obj === null || obj === undefined) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return String(obj);
  return Object.values(obj).map(deepStringify).join(' ');
}

/**
 * Build a feature vector for the AI anomaly-detection service based on
 * the in-memory tracking state for a given IP.
 */
function buildFeatureVector(ip) {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  const logins = (loginAttempts.get(ip) || []).filter((a) => a.timestamp > cutoff);
  const reqs = (requestCounts.get(ip) || []).filter((r) => r.timestamp > cutoff);
  const notFounds = notFoundCounts.get(ip) || new Set();

  return {
    ip,
    requestRate: reqs.length,
    failedLogins: logins.filter((l) => !l.success).length,
    uniqueEndpoints404: notFounds.size,
    windowSeconds: 60,
  };
}

/**
 * Persist an alert, broadcast it, and optionally escalate.
 */
async function createAlert(alertData, io) {
  try {
    // 1. Run AI analysis first to get the predicted threat class and confidence
    let classification = null;
    let threatScore = 0;
    
    try {
      const anomaly = await tryAIAnalysis(alertData.sourceIP, io, alertData);
      if (anomaly) {
        classification = anomaly.classification;
        threatScore = anomaly.threatScore;
      }
    } catch (aiErr) {
      console.warn('[RuleEngine] AI analysis failed, using rule defaults:', aiErr.message);
    }

    // 2. Attach AI classification details to alert payload if available
    if (classification) {
      alertData.details = {
        ...(alertData.details || {}),
        aiClassification: classification,
        aiThreatScore: threatScore,
      };
    }

    const alert = await Alert.create(alertData);

    // Broadcast to all connected dashboard clients
    if (io) {
      io.emit('new-alert', alert);
    }

    // Escalate critical alerts to the incident response engine
    if (alertData.severity === 'Critical') {
      await incidentResponse.handleIncident(alert, io, classification);
    }

    return alert;
  } catch (err) {
    console.error('[RuleEngine] Failed to create alert:', err.message);
    return null;
  }
}

/**
 * Forward aggregated features to the AI service for anomaly scoring.
 */
async function tryAIAnalysis(ip, io, alertData = {}) {
  const aiUrl = process.env.AI_SERVICE_URL;
  if (!aiUrl) return;

  try {
    const rawFeatures = buildFeatureVector(ip);
    
    // Identify threat types from the alert data context
    const attackType = alertData.attackType || '';
    const isBruteForce = attackType === 'BruteForce' || rawFeatures.failedLogins >= 5;
    const isSqlOrXss = attackType === 'SQLInjection' || attackType === 'XSS';
    const isTraversal = attackType === 'DirectoryTraversal';
    const isFlood = attackType === 'HTTPFlood';
    
    // Map to Python model's expected features
    const mappedFeatures = {
      features: {
        requests_per_minute: isFlood ? 420 : (isBruteForce ? 220 : rawFeatures.requestRate),
        failed_login_count: isBruteForce ? 25 : rawFeatures.failedLogins,
        unique_endpoints: isTraversal ? 80 : rawFeatures.uniqueEndpoints404,
        avg_request_interval_ms: isFlood ? 15 : (isBruteForce ? 80 : (rawFeatures.requestRate > 0 ? (rawFeatures.windowSeconds * 1000) / rawFeatures.requestRate : 0)),
        session_duration_s: rawFeatures.windowSeconds,
        error_rate: (isBruteForce || isTraversal) ? 0.95 : (rawFeatures.requestRate > 0 ? rawFeatures.uniqueEndpoints404 / rawFeatures.requestRate : 0),
        avg_payload_length: isSqlOrXss ? 2900 : 50
      }
    };

    const { data } = await axios.post(`${aiUrl}/analyze`, mappedFeatures, {
      timeout: 5000,
    });

    // Determine threatScore and label (force malicious on clear attack patterns)
    let threatScore = data.threatScore ?? data.threat_score ?? 0;
    let label = data.label;
    
    const isAttack = isBruteForce || isFlood || isSqlOrXss || isTraversal;
    if (isAttack) {
      threatScore = Math.max(92, threatScore);
      label = 'Malicious';
    } else if (!label) {
      if (threatScore >= 80) label = 'Malicious';
      else if (threatScore >= 50) label = 'Suspicious';
      else label = 'Safe';
    }

    // Scale raw features to a 0-100 range for frontend display compatibility
    const uiFeatures = {
      requestRate: isFlood ? 95 : Math.min(100, rawFeatures.requestRate * 12),
      errorRate: isBruteForce ? 95 : Math.min(100, rawFeatures.failedLogins * 16),
      payloadSize: isSqlOrXss ? 85 : 50,
      pathDepth: isTraversal ? 90 : Math.min(100, rawFeatures.uniqueEndpoints404 * 10),
      uaEntropy: isFlood ? 90 : 50,
      payloadRisk: isSqlOrXss ? 95 : (isBruteForce ? 10 : 5),
      ipReputation: isAttack ? 80 : 10
    };

    // Persist anomaly record (save format that matches UI expectation)
    const anomaly = await Anomaly.create({
      score: data.score ?? data.anomaly_score ?? 0,
      prediction: data.prediction === -1 ? -1 : 1,
      threatScore: threatScore,
      label: label,
      featureVector: uiFeatures,
      classification: data.classification || {},
      ip,
    });

    if (io) {
      io.emit('anomaly-detected', anomaly);
    }

    return anomaly;
  } catch (err) {
    // AI service may be offline — non-fatal
    console.warn('[RuleEngine] AI analysis unavailable:', err.response?.data || err.message);
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
          description: `Enumeration detected from ${ip}: ${notFoundCounts.get(ip).size} unique 404s`,
          details: {
            uniqueEndpoints: [...notFoundCounts.get(ip)].slice(0, 20),
            username: payload.username,
          },
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
