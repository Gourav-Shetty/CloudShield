const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: [true, 'Severity is required'],
  },
  attackType: {
    type: String,
    required: [true, 'Attack type is required'],
    enum: [
      'BruteForce',
      'SQLInjection',
      'XSS',
      'DirectoryTraversal',
      'Enumeration',
      'HTTPFlood',
      'AnomalyDetected',
    ],
  },
  sourceIP: {
    type: String,
    required: [true, 'Source IP is required'],
  },
  description: {
    type: String,
    default: '',
  },
  details: {
    type: Object,
    default: {},
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Alert', alertSchema);
