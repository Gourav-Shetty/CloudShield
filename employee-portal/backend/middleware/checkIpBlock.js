const axios = require('axios');

/**
 * Express middleware that queries the monitoring platform to verify if
 * the client IP has been security-blocked.
 * 
 * If blocked, it immediately returns a 403 Forbidden response.
 */
const checkIpBlock = async (req, res, next) => {
  try {
    const monitoringUrl = process.env.MONITORING_URL || 'http://localhost:5000';
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;

    // Call the check endpoint on the monitoring platform
    const resp = await axios.get(`${monitoringUrl}/blocked-ips/check/${encodeURIComponent(ip)}`, { timeout: 1000 });
    
    if (resp.data && resp.data.blocked) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Your IP address has been blocked due to a security violation.',
        isIpBlocked: true
      });
    }
  } catch (err) {
    // If monitoring platform is down, fail-open to not block legitimate portal traffic
  }
  next();
};

module.exports = checkIpBlock;
