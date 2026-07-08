const express = require('express');
const AttackHistory = require('../models/AttackHistory');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  GET /reports — List all attack-history reports                     */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    const reports = await AttackHistory.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ reports });
  } catch (err) {
    console.error('[Reports] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /reports/:id — Single report by reportId (RPT-XXXX) or _id   */
/* ------------------------------------------------------------------ */

router.get('/:id', auth, async (req, res) => {
  try {
    const report = await AttackHistory.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : undefined },
        { reportId: req.params.id },
      ].filter(Boolean),
    }).lean();

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    return res.json({ report });
  } catch (err) {
    console.error('[Reports] GET/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
});

module.exports = router;
