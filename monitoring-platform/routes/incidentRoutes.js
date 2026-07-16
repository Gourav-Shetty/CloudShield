const express = require('express');
const Incident = require('../models/Incident');
const { lockUserAccount } = require('../services/incidentResponse');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  GET /incidents — List all incidents                                */
/* ------------------------------------------------------------------ */

router.get('/', auth, async (req, res) => {
  try {
    const incidents = await Incident.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ incidents });
  } catch (err) {
    console.error('[Incidents] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /incidents/:id — Single incident with populated alerts        */
/* ------------------------------------------------------------------ */

router.get('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : undefined },
        { incidentId: req.params.id },
      ].filter(Boolean),
    }).populate('relatedAlerts');

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    return res.json({ incident });
  } catch (err) {
    console.error('[Incidents] GET/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch incident' });
  }
});

/* ------------------------------------------------------------------ */
/*  PUT /incidents/:id/resolve — Resolve an incident                  */
/* ------------------------------------------------------------------ */

router.put('/:id/resolve', auth, async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : undefined },
        { incidentId: req.params.id },
      ].filter(Boolean),
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    incident.status = 'Resolved';
    incident.resolvedAt = new Date();
    incident.actionsTaken.push({
      action: 'Incident resolved',
      timestamp: new Date(),
      details: req.body.details || 'Manually resolved by admin',
    });

    await incident.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-resolved', incident);
    }

    return res.json({ message: 'Incident resolved', incident });
  } catch (err) {
    console.error('[Incidents] Resolve error:', err.message);
    return res.status(500).json({ error: 'Failed to resolve incident' });
  }
});

/* ------------------------------------------------------------------ */
/*  PUT /incidents/:id/status — Update incident status                */
/* ------------------------------------------------------------------ */

router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const incident = await Incident.findOne({
      $or: [
        { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : undefined },
        { incidentId: req.params.id },
      ].filter(Boolean),
    });

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Capitalize to match backend enum ['Open', 'Investigating', 'Resolved']
    const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    incident.status = capitalizedStatus;

    if (capitalizedStatus === 'Resolved') {
      incident.resolvedAt = new Date();
    }

    incident.actionsTaken.push({
      action: `Status updated to ${capitalizedStatus}`,
      timestamp: new Date(),
      details: `Incident status manually transitioned to ${capitalizedStatus}`,
    });

    await incident.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-updated', incident);
    }

    return res.json({ message: 'Incident status updated', incident });
  } catch (err) {
    console.error('[Incidents] Status update error:', err.message);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /unlock-account — Unlock a user account by IP                */
/* ------------------------------------------------------------------ */

router.post('/unlock-account', auth, async (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    const mongoose = require('mongoose');
    const portalUri = process.env.PORTAL_DB_URI;
    if (!portalUri) {
      return res.status(500).json({ error: 'PORTAL_DB_URI not configured' });
    }

    // Look up recent failed login logs to find targeted usernames
    // Use a 30-minute window (wider than the lock's 5-min window) to catch stale attacks
    let usernames = [];
    try {
      const Log = require('../models/Log');
      const cutoff = new Date(Date.now() - 30 * 60 * 1000);
      const recentLogs = await Log.find({
        ip,
        eventType: { $in: ['Login', 'LoginFailure', 'LoginLocked'] },
        timestamp: { $gte: cutoff },
      }).lean();
      usernames = [...new Set(recentLogs.map(l => l.payload?.username).filter(Boolean))];
    } catch (logErr) {
      console.warn('[Incidents] Unlock: failed to query logs for usernames:', logErr.message);
    }

    let portalConn;
    try {
      portalConn = await mongoose.createConnection(portalUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }).asPromise();

      const UserModel = portalConn.models.UserUnlock || portalConn.model(
        'UserUnlock',
        new mongoose.Schema({ isLocked: Boolean, lastLoginIP: String, username: String }),
        'users',
      );

      // Build the same broad query that lockUserAccount used
      const query = { $or: [{ lastLoginIP: ip }] };
      if (usernames.length > 0) {
        query.$or.push({ username: { $in: usernames } });
      }

      const unlockResult = await UserModel.updateMany(
        query,
        { $set: { isLocked: false } },
      );

      const msg = unlockResult.modifiedCount > 0
        ? `Unlocked ${unlockResult.modifiedCount} account(s) for IP ${ip}${usernames.length ? ' (targeted: ' + usernames.join(', ') + ')' : ''}`
        : `No locked accounts found for IP ${ip}`;

      console.log(`[Incidents] ${msg}`);
      return res.json({ message: msg, modifiedCount: unlockResult.modifiedCount });
    } finally {
      if (portalConn) await portalConn.close();
    }
  } catch (err) {
    console.error('[Incidents] Unlock error:', err.message);
    return res.status(500).json({ error: 'Failed to unlock account' });
  }
});

module.exports = router;
