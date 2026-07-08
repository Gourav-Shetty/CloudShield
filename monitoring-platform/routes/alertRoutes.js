const express = require('express');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  GET /alerts — Filtered & paginated alerts                         */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    const { severity, attackType, startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const skip = parseInt(req.query.skip, 10) || 0;

    const filter = {};

    if (severity) filter.severity = severity;
    if (attackType) filter.attackType = attackType;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Alert.countDocuments(filter),
    ]);

    return res.json({ total, limit, skip, alerts });
  } catch (err) {
    console.error('[Alerts] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/* ------------------------------------------------------------------ */
/*  PUT /alerts/:id/resolve — Mark alert as resolved                  */
/* ------------------------------------------------------------------ */

router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { isResolved: true },
      { new: true },
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Notify connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('alert-resolved', alert);
    }

    return res.json({ message: 'Alert resolved', alert });
  } catch (err) {
    console.error('[Alerts] Resolve error:', err.message);
    return res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

module.exports = router;
