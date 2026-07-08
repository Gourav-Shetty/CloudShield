const express = require('express');
const axios = require('axios');
const Anomaly = require('../models/Anomaly');
const auth = require('../middleware/auth');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  POST /analyze — Proxy to AI service and persist result             */
/* ------------------------------------------------------------------ */

router.post('/', auth, async (req, res) => {
  try {
    const featureVector = req.body;

    if (!featureVector || Object.keys(featureVector).length === 0) {
      return res.status(400).json({ error: 'Feature vector is required' });
    }

    const aiUrl = process.env.AI_SERVICE_URL;
    if (!aiUrl) {
      return res.status(503).json({ error: 'AI service URL not configured' });
    }

    // Forward to AI service
    let aiResult;
    try {
      const response = await axios.post(`${aiUrl}/analyze`, featureVector, {
        timeout: 10000,
      });
      aiResult = response.data;
    } catch (aiErr) {
      console.error('[Analyze] AI service error:', aiErr.message);
      return res.status(502).json({
        error: 'AI service unavailable',
        details: aiErr.message,
      });
    }

    // Persist anomaly record
    const anomaly = await Anomaly.create({
      score: aiResult.score ?? aiResult.anomaly_score ?? 0,
      prediction: aiResult.prediction === -1 ? -1 : 1,
      threatScore: aiResult.threatScore ?? aiResult.threat_score ?? 0,
      label: aiResult.label || 'Safe',
      featureVector,
      ip: featureVector.ip || 'unknown',
    });

    // Broadcast to connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('anomaly-detected', anomaly);
    }

    return res.json({
      message: 'Analysis complete',
      anomaly,
      aiResult,
    });
  } catch (err) {
    console.error('[Analyze] Error:', err.message);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

module.exports = router;
