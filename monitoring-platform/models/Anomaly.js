const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  score: {
    type: Number,
  },
  prediction: {
    type: Number,
    enum: [-1, 1],
  },
  threatScore: {
    type: Number,
  },
  label: {
    type: String,
    enum: ['Safe', 'Suspicious', 'Malicious'],
  },
  featureVector: {
    type: Object,
    default: {},
  },
  ip: {
    type: String,
  },
  classification: {
    type: Object,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Anomaly', anomalySchema);
