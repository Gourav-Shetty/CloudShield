const axios = require('axios');

const logClient = axios.create({
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Send a log entry to the monitoring platform.
 * Fire-and-forget — never crashes the main app if monitoring is down.
 *
 * @param {Object} logData
 * @param {string} logData.ip          - Client IP address
 * @param {string} logData.method      - HTTP method (GET, POST, etc.)
 * @param {string} logData.endpoint    - Request URL / path
 * @param {number} logData.status      - HTTP response status code
 * @param {string} logData.userAgent   - Client User-Agent header
 * @param {string} logData.eventType   - Login | Request | Error
 * @param {*}      logData.payload     - Request body (if any)
 */
const sendLog = async (logData) => {
  try {
    const monitoringUrl = process.env.MONITORING_URL || 'http://localhost:5000';

    const entry = {
      timestamp: new Date().toISOString(),
      ip: logData.ip || 'unknown',
      method: logData.method || 'UNKNOWN',
      endpoint: logData.endpoint || '/',
      status: logData.status || 0,
      userAgent: logData.userAgent || 'unknown',
      eventType: logData.eventType || 'Request',
      payload: logData.payload || {},
    };

    await logClient.post(`${monitoringUrl}/logs`, entry);
  } catch (error) {
    // Silently ignore — monitoring being down must never affect the portal
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[LogClient] Failed to send log: ${error.message}`);
    }
  }
};

module.exports = { logClient, sendLog };
