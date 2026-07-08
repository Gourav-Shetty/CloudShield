const express = require('express');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const Incident = require('../models/Incident');
const BlockedIp = require('../models/BlockedIp');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  GET /dashboard — Aggregated statistics for the monitoring UI      */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    // Run all independent queries in parallel
    const [
      totalLogs,
      activeAlerts,
      openIncidents,
      blockedIPs,
      recentAlerts,
      recentLogs,
      threatDistribution,
      logsByHour,
    ] = await Promise.all([
      // 1. Total log count
      Log.countDocuments(),

      // 2. Active (unresolved) alert count
      Alert.countDocuments({ isResolved: false }),

      // 3. Open incident count
      Incident.countDocuments({ status: { $ne: 'Resolved' } }),

      // 4. Currently blocked IPs
      BlockedIp.countDocuments({ isActive: true }),

      // 5. Last 10 alerts
      Alert.find().sort({ createdAt: -1 }).limit(10).lean(),

      // 6. Last 20 logs
      Log.find().sort({ timestamp: -1 }).limit(20).lean(),

      // 7. Threat distribution (alerts grouped by attackType)
      Alert.aggregate([
        { $group: { _id: '$attackType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // 8. Logs by hour for the last 24 h
      Log.aggregate([
        {
          $match: {
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%dT%H:00:00', date: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.json({
      totalLogs,
      activeAlerts,
      openIncidents,
      blockedIPs,
      recentAlerts,
      recentLogs,
      threatDistribution,
      logsByHour,
    });
  } catch (err) {
    console.error('[Dashboard] Error:', err.message);
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

module.exports = router;
