const { sendLog } = require('../config/logClient');

/**
 * Express middleware that intercepts every response and sends a structured
 * log entry to the monitoring platform.
 *
 * It monkey-patches res.json and res.send so it can capture the final
 * status code AFTER the controller has set it, then fires the log
 * asynchronously (fire-and-forget) so it never delays the response.
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original methods
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  const logAndForward = (originalMethod, body) => {
    // Prevent double logging when res.json calls res.send internally
    if (res._logged) {
      return originalMethod(body);
    }
    res._logged = true;

    // Exclude CAPTCHA challenges from being logged to prevent double-counting
    let parsedBody = {};
    try {
      parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (_) {}
    if (parsedBody && parsedBody.captchaRequired) {
      return originalMethod(body);
    }

    // Determine event type
    let eventType = 'Request';
    if (req.originalUrl.includes('/auth')) {
      eventType = 'Login';
    } else if (res.statusCode >= 400) {
      eventType = 'Error';
    }

    const logPayload = req.body && Object.keys(req.body).length > 0 ? { ...req.body } : {};
    if (req.user && req.user.username) {
      logPayload.username = req.user.username;
    }

    // Fire-and-forget — don't await
    sendLog({
      ip: (() => {
        let ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
        if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') return '127.0.0.1';
        if (ip.startsWith('::ffff:')) return ip.substring(7);
        return ip;
      })(),
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      userAgent: req.headers['user-agent'] || 'unknown',
      eventType,
      payload: Object.keys(logPayload).length > 0 ? logPayload : undefined,
    });

    return originalMethod(body);
  };

  // Patch res.json
  res.json = (body) => logAndForward(originalJson, body);

  // Patch res.send
  res.send = (body) => logAndForward(originalSend, body);

  next();
};

module.exports = requestLogger;
