const mongoose = require('mongoose');

const systemStatusSchema = new mongoose.Schema({
  cpu: {
    type: String,
    default: '0%',
  },
  memory: {
    type: String,
    default: '0%',
  },
  disk: {
    type: String,
    default: 'N/A',
  },
  uptime: {
    type: String,
    default: '0s',
  },
  nginx: {
    type: String,
    enum: ['running', 'stopped', 'unknown'],
    default: 'unknown',
  },
  backend: {
    type: String,
    enum: ['running', 'stopped'],
    default: 'running',
  },
  aiService: {
    type: String,
    enum: ['running', 'stopped', 'unknown'],
    default: 'unknown',
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'system_status' });

module.exports = mongoose.model('SystemStatus', systemStatusSchema);
