const axios = require('axios');

// In-memory store for rate limiting (timestamp history per IP)
const requestHistory = new Map();

// In-memory store for resolved CAPTCHA verification tokens
const resolvedCaptchaTokens = new Map();

// WAF Signature Regexes
const SQL_INJECTION_RE =
  /(UNION\s+(ALL\s+)?SELECT|SELECT\s+.*FROM|INSERT\s+INTO|UPDATE\s+.*SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|OR\s+['"]?\d+['"]?\s*=\s*['"]?\d+|AND\s+['"]?\d+['"]?\s*=\s*['"]?\d+|--|#|\/\*|\*\/|xp_cmdshell|exec\s*\(|benchmark\s*\(|sleep\s*\()/i;

const XSS_RE =
  /(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|onclick\s*=|onmouseover\s*=|onfocus\s*=|onblur\s*=|onchange\s*=|onkeydown\s*=|onkeyup\s*=|onkeypress\s*=|alert\s*\(|prompt\s*\(|confirm\s*\(|eval\s*\(|document\.cookie|document\.write|<iframe|<object|<embed|<svg)/i;

const DIR_TRAVERSAL_RE =
  /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|%2e%2e\\|\.\.%2f|\.\.%5c|\/etc\/(passwd|shadow|hosts|group|issue)|\/proc\/self\/environ|win\.ini|boot\.ini|system\.ini|web\.config|wp-config\.php|\.env)/i;

const PORT_SCAN_RE =
  /(nmap|nikto|sqlmap|dirbuster|gobuster|masscan|w3af|hydra|acunetix|nessus)/i;

// Periodically clean history store (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requestHistory.entries()) {
    const valid = timestamps.filter(t => now - t < 5000);
    if (valid.length === 0) {
      requestHistory.delete(ip);
    } else {
      requestHistory.set(ip, valid);
    }
  }
}, 120_000);

/**
 * Get normalized client IP address to prevent local dual-stack mismatch
 */
const getClientIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * Express middleware that queries the monitoring platform to verify if
 * the client IP has active restrictions (Block, RateLimit, Captcha).
 */
const checkIpBlock = async (req, res, next) => {
  try {
    const monitoringUrl = process.env.MONITORING_URL || 'http://localhost:5000';
    const ip = getClientIp(req);

    // ── 0. INLINE WAF SIGNATURE CHECKS ──
    const userAgent = req.headers['user-agent'] || '';
    const endpoint = req.originalUrl || '';
    const bodyStr = req.body ? JSON.stringify(req.body) : '';
    const requestPayload = endpoint + bodyStr;

    let matchedSignature = false;
    let attackType = '';

    if (PORT_SCAN_RE.test(userAgent)) {
      matchedSignature = true;
      attackType = 'PortScan';
    } else if (DIR_TRAVERSAL_RE.test(endpoint)) {
      matchedSignature = true;
      attackType = 'DirectoryTraversal';
    } else if (SQL_INJECTION_RE.test(requestPayload)) {
      matchedSignature = true;
      attackType = 'SQLInjection';
    } else if (XSS_RE.test(bodyStr)) {
      matchedSignature = true;
      attackType = 'XSS';
    }

    if (matchedSignature) {
      console.warn(`[WAF] Inline Blocked ${attackType} from ${ip} on ${endpoint}`);
      
      // Asynchronously log the attack to the monitoring platform
      try {
        const { sendLog } = require('../config/logClient');
        const logPayload = req.body && Object.keys(req.body).length > 0 ? { ...req.body } : {};
        if (req.user && req.user.username) {
          logPayload.username = req.user.username;
        }

        sendLog({
          ip,
          method: req.method,
          endpoint,
          status: 403,
          userAgent,
          eventType: 'Request',
          payload: Object.keys(logPayload).length > 0 ? logPayload : undefined,
        });
      } catch (logErr) {
        console.error('[WAF] Failed to send inline log to monitoring platform:', logErr.message);
      }

      // Return 403 immediately! Do not proceed to next()
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Your IP address has been blocked due to a security violation.',
        isIpBlocked: true
      });
    }

    // Call the check endpoint on the monitoring platform
    const resp = await axios.get(`${monitoringUrl}/blocked-ips/check/${encodeURIComponent(ip)}`, { timeout: 1000 });
    
    if (resp.data && resp.data.blocked) {
      const { restrictionType, rateLimitRps = 2 } = resp.data.block;

      // ── 1. HARD BLOCK ──
      if (restrictionType === 'Block') {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: Your IP address has been blocked due to a security violation.',
          isIpBlocked: true
        });
      }

      // ── 2. RATE LIMITING ──
      if (restrictionType === 'RateLimit') {
        const now = Date.now();
        if (!requestHistory.has(ip)) {
          requestHistory.set(ip, []);
        }
        const history = requestHistory.get(ip).filter(t => now - t < 1000); // last 1 second
        history.push(now);
        requestHistory.set(ip, history);

        if (history.length > rateLimitRps) {
          return res.status(429).json({
            success: false,
            message: 'Too Many Requests: Rate limit exceeded under security quarantine. Slow down.',
            isRateLimited: true
          });
        }
      }

      // ── 3. CAPTCHA CHALLENGE ──
      if (restrictionType === 'Captcha') {
        const isVerifyCaptchaRoute = req.originalUrl.includes('/verify-captcha');
        const isWriteAction = ['POST', 'PUT', 'DELETE'].includes(req.method);
        
        if (isWriteAction && !isVerifyCaptchaRoute) {
          const captchaToken = req.headers['x-captcha-token'];
          console.log('[checkIpBlock] Received captcha-token header:', captchaToken);
          console.log('[checkIpBlock] Active keys in resolvedCaptchaTokens Map:', Array.from(resolvedCaptchaTokens.keys()));
          
          if (!captchaToken || !resolvedCaptchaTokens.has(captchaToken)) {
            console.log('[checkIpBlock] Verification failed: token is missing or not in Map');
            return res.status(403).json({
              success: false,
              message: 'Security Verification Required: Please complete the slide CAPTCHA to continue.',
              captchaRequired: true
            });
          }
          // Consume single-use token
          resolvedCaptchaTokens.delete(captchaToken);
          console.log('[checkIpBlock] Verification successful, token consumed.');
        }
      }
    }
  } catch (err) {
    // Fail-open to avoid disrupting traffic if monitoring is down
  }
  next();
};

module.exports = {
  checkIpBlock,
  resolvedCaptchaTokens,
};
