const axios = require('axios');

// In-memory store for rate limiting (timestamp history per IP)
const requestHistory = new Map();

// In-memory store for resolved CAPTCHA verification tokens
const resolvedCaptchaTokens = new Map();

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

    // Call the check endpoint on the monitoring platform
    const resp = await axios.get(`${monitoringUrl}/blocked-ips/check/${encodeURIComponent(ip)}`, { timeout: 1000 });
    
    if (resp.data && resp.data.blocked) {
      const { restrictionType, rateLimitRps = 2 } = resp.data.block;

      // ── 1. HARD BLOCK ──
      if (restrictionType === 'Block') {
        // Loopback developer bypass to prevent local session lockout
        if (ip === '127.0.0.1') {
          console.log('[checkIpBlock] Bypassing hard block for loopback developer IP.');
          return next();
        }
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
