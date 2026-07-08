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
    // Determine event type
    let eventType = 'Request';
    if (req.originalUrl.includes('/auth')) {
      eventType = 'Login';
    } else if (res.statusCode >= 400) {
      eventType = 'Error';
    }

    // Fire-and-forget — don't await
    sendLog({
      ip: req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress,
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      userAgent: req.headers['user-agent'] || 'unknown',
      eventType,
      payload: req.body && Object.keys(req.body).length > 0 ? req.body : undefined,
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
