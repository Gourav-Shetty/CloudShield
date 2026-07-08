const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    index: true,
  },
  method: {
    type: String,
    trim: true,
  },
  endpoint: {
    type: String,
    trim: true,
  },
  status: {
    type: Number,
  },
  userAgent: {
    type: String,
  },
  eventType: {
    type: String,
    enum: ['Login', 'Request', 'Error', 'Attack'],
    default: 'Request',
  },
  payload: {
    type: Object,
    default: {},
  },
  geo: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model('Log', logSchema);
