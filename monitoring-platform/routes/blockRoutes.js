const express = require('express');
const BlockedIp = require('../models/BlockedIp');
const { manualBlock, manualUnblock } = require('../services/incidentResponse');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  GET /blocked-ips — List blocked IPs                                */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    const filter = {};

    // Default to active-only unless explicitly overridden
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    } else {
      filter.isActive = true;
    }

    const blockedIps = await BlockedIp.find(filter)
      .sort({ blockedAt: -1 })
      .lean();

    return res.json({ blockedIps });
  } catch (err) {
    console.error('[BlockedIPs] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch blocked IPs' });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /block-ip — Manually block an IP                              */
/* ------------------------------------------------------------------ */

router.post('/', auth, async (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const io = req.app.get('io');
    const result = await manualBlock(ip, reason, io);

    return res.status(201).json(result);
  } catch (err) {
    console.error('[BlockedIPs] POST error:', err.message);
    return res.status(500).json({ error: 'Failed to block IP' });
  }
});

/* ------------------------------------------------------------------ */
/*  DELETE /blocked-ips/:id — Manually unblock by document ID          */
/* ------------------------------------------------------------------ */

router.delete('/:id', auth, async (req, res) => {
  try {
    const block = await BlockedIp.findById(req.params.id);

    if (!block) {
      return res.status(404).json({ error: 'Blocked IP record not found' });
    }

    const io = req.app.get('io');
    const result = await manualUnblock(block.ip, io);

    return res.json(result);
  } catch (err) {
    console.error('[BlockedIPs] DELETE error:', err.message);
    return res.status(500).json({ error: 'Failed to unblock IP' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /blocked-ips/check/:ip — Public check if an IP is blocked      */
/* ------------------------------------------------------------------ */
router.get('/check/:ip', async (req, res) => {
  try {
    const { ip } = req.params;
    const block = await BlockedIp.findOne({ ip, isActive: true }).lean();
    return res.json({ blocked: !!block, block });
  } catch (err) {
    console.error('[BlockedIPs] Public check error:', err.message);
    return res.status(500).json({ error: 'Check failed' });
  }
});

module.exports = router;
