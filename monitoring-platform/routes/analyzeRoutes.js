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

    let aiPayload = featureVector;

    // If request comes from the UI manual form, translate its 7 visual features to the Python model's 7 expected features
    if (featureVector.features && featureVector.features.requestRate !== undefined) {
      const f = featureVector.features;
      aiPayload = {
        features: {
          requests_per_minute: (f.requestRate || 0) * 60,
          failed_login_count: (f.errorRate || 0),
          unique_endpoints: (f.pathDepth || 0),
          avg_request_interval_ms: f.requestRate > 0 ? 1000 / f.requestRate : 0,
          session_duration_s: 60,
          error_rate: f.errorRate ? f.errorRate / 100 : 0,
          avg_payload_length: f.payloadSize || 0
        }
      };
    } else if (featureVector.requestRate !== undefined) {
      // If it comes from the ruleEngine.js which sends { ip, requestRate, failedLogins, uniqueEndpoints404, windowSeconds }
      aiPayload = {
        features: {
          requests_per_minute: featureVector.requestRate,
          failed_login_count: featureVector.failedLogins,
          unique_endpoints: featureVector.uniqueEndpoints404,
          avg_request_interval_ms: featureVector.requestRate > 0 ? (featureVector.windowSeconds * 1000) / featureVector.requestRate : 0,
          session_duration_s: featureVector.windowSeconds,
          error_rate: featureVector.requestRate > 0 ? featureVector.uniqueEndpoints404 / featureVector.requestRate : 0,
          avg_payload_length: 50
        }
      };
    }

    // Forward to AI service
    let aiResult;
    try {
      const response = await axios.post(`${aiUrl}/analyze`, aiPayload, {
        timeout: 10000,
      });
      aiResult = response.data;
    } catch (aiErr) {
      console.error('[Analyze] AI service error:', aiErr.response?.data || aiErr.message);
      return res.status(502).json({
        error: 'AI service unavailable',
        details: aiErr.response?.data || aiErr.message,
      });
    }

    // Determine a label based on the prediction/threatScore
    let label = aiResult.label;
    if (!label) {
      if (aiResult.threat_score >= 80) label = 'Anomalous';
      else if (aiResult.threat_score >= 50) label = 'Suspicious';
      else label = 'Normal';
    }

    const featureObj = featureVector.features || featureVector;

    // Persist anomaly record (save the original UI feature vector so the frontend radar chart works)
    const anomaly = await Anomaly.create({
      score: aiResult.score ?? aiResult.anomaly_score ?? 0,
      prediction: aiResult.prediction === -1 ? -1 : 1,
      threatScore: aiResult.threatScore ?? aiResult.threat_score ?? 0,
      label: label,
      featureVector: featureObj,
      ip: featureVector.ip || 'unknown',
    });

    // Broadcast to connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('anomaly-detected', anomaly);
    }

    return res.json({
      message: 'Analysis complete',
      id: anomaly._id,
      threatScore: anomaly.threatScore,
      label: anomaly.label === 'Malicious' || anomaly.label === 'Anomalous' ? 'Anomalous' : 'Normal',
      prediction: getDescriptivePrediction(anomaly.threatScore, featureObj),
      timestamp: anomaly.timestamp,
      features: anomaly.featureVector,
      ip: anomaly.ip
    });
  } catch (err) {
    console.error('[Analyze] Error:', err.message);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * Determine a realistic and dynamic prediction label based on feature vector metrics
 */
function getDescriptivePrediction(threatScore, f = {}) {
  if (threatScore >= 80) {
    if ((f.payloadRisk || 0) > 60) return 'SQLi/XSS Injection Vector';
    if ((f.requestRate || 0) > 70) return 'DDoS Flood Activity';
    if ((f.errorRate || 0) > 70) return 'Brute Force Lockout Attack';
    if ((f.uaEntropy || 0) > 70 && (f.ipReputation || 0) > 60) return 'Malicious Bot Spidering';
    return 'Critical Protocol Anomaly';
  } else if (threatScore >= 50) {
    if ((f.pathDepth || 0) > 60) return 'Directory Traversal Scanning';
    return 'Suspicious Scanning Pattern';
  } else if (threatScore >= 25) {
    return 'Suspicious Network Probe';
  }
  return 'Normal Request Baseline';
}

/* ------------------------------------------------------------------ */
/*  GET /detections — List AI anomaly logs                            */
/* ------------------------------------------------------------------ */

router.get('/detections', auth, async (req, res) => {
  try {
    const anomalies = await Anomaly.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    // Map to frontend expected format
    const formatted = anomalies.map(a => ({
      id: a._id,
      ip: a.ip,
      threatScore: a.threatScore,
      label: a.label === 'Malicious' || a.label === 'Anomalous' ? 'Anomalous' : 'Normal',
      prediction: getDescriptivePrediction(a.threatScore, a.featureVector),
      timestamp: a.timestamp,
      features: a.featureVector
    }));

    return res.json(formatted);
  } catch (err) {
    console.error('[Analyze] GET error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch detections' });
  }
});

module.exports = router;
