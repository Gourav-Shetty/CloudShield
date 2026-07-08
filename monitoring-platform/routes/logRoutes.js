const express = require('express');
const Log = require('../models/Log');
const { analyzeLog } = require('../services/ruleEngine');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  POST /logs — Receive log from employee portal (no auth required)  */
/* ------------------------------------------------------------------ */

router.post('/', async (req, res) => {
  try {
    const logData = req.body;

    if (!logData.ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const log = await Log.create(logData);

    // Run through the rule engine (non-blocking in terms of response,
    // but we await to capture any created alert for the response body).
    const io = req.app.get('io');
    const alert = await analyzeLog(logData, io);

    return res.status(201).json({
      message: 'Log received',
      logId: log._id,
      alert: alert || null,
    });
  } catch (err) {
    console.error('[Logs] POST error:', err.message);
    return res.status(500).json({ error: 'Failed to process log' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /logs — Paginated recent logs (auth required)                 */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    const skip = parseInt(req.query.skip, 10) || 0;

    const logs = await Log.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Log.countDocuments();

    return res.json({ total, limit, skip, logs });
  } catch (err) {
    console.error('[Logs] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
