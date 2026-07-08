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
    const alert = await Alert.create(alertData);

    // Broadcast to all connected dashboard clients
    if (io) {
      io.emit('new-alert', alert);
    }

    // Escalate critical alerts to the incident response engine
    if (alertData.severity === 'Critical') {
      await incidentResponse.handleIncident(alert, io);
    }

    // Fire-and-forget AI analysis
    tryAIAnalysis(alertData.sourceIP, io).catch(() => {});

    return alert;
  } catch (err) {
    console.error('[RuleEngine] Failed to create alert:', err.message);
    return null;
  }
}

/**
 * Forward aggregated features to the AI service for anomaly scoring.
 */
async function tryAIAnalysis(ip, io) {
  const aiUrl = process.env.AI_SERVICE_URL;
  if (!aiUrl) return;

  try {
    const features = buildFeatureVector(ip);
    const { data } = await axios.post(`${aiUrl}/analyze`, features, {
      timeout: 5000,
    });

    // Persist anomaly record
    const anomaly = await Anomaly.create({
      score: data.score ?? data.anomaly_score ?? 0,
      prediction: data.prediction === -1 ? -1 : 1,
      threatScore: data.threatScore ?? data.threat_score ?? 0,
      label: data.label || 'Safe',
      featureVector: features,
      ip,
    });

    if (io) {
      io.emit('anomaly-detected', anomaly);
    }
  } catch (err) {
    // AI service may be offline — non-fatal
    console.warn('[RuleEngine] AI analysis unavailable:', err.message);
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

    if (recent.length > 5) {
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
        details: { endpoint, payloadSnippet: sqlTarget.substring(0, 500) },
      },
      io,
    );
  }

  /* ---------- Rule 3: XSS ---------- */
  const payloadString = deepStringify(payload);
  if (XSS_RE.test(payloadString)) {
    return createAlert(
      {
        severity: 'High',
        attackType: 'XSS',
        sourceIP: ip,
        description: `XSS attempt detected from ${ip} on ${endpoint}`,
        details: { endpoint, payloadSnippet: payloadString.substring(0, 500) },
      },
      io,
    );
  }

  /* ---------- Rule 4: Directory Traversal ---------- */
  if (DIR_TRAVERSAL_RE.test(endpoint)) {
    return createAlert(
      {
        severity: 'High',
        attackType: 'DirectoryTraversal',
        sourceIP: ip,
        description: `Directory traversal attempt from ${ip}: ${endpoint}`,
        details: { endpoint },
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
          severity: 'Medium',
          attackType: 'Enumeration',
          sourceIP: ip,
          description: `Enumeration detected from ${ip}: ${notFoundCounts.get(ip).size} unique 404s`,
          details: {
            uniqueEndpoints: [...notFoundCounts.get(ip)].slice(0, 20),
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
        severity: 'High',
        attackType: 'HTTPFlood',
        sourceIP: ip,
        description: `HTTP flood from ${ip}: ${recentReqs.length} requests in 60 s`,
        details: { requestCount: recentReqs.length, window: '60s' },
      },
      io,
    );
  }

  return null;
}

module.exports = { analyzeLog };
