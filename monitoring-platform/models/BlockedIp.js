const mongoose = require('mongoose');

const blockedIpSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: [true, 'IP address is required'],
    index: true,
  },
  blockedAt: {
    type: Date,
    default: Date.now,
  },
  unblockAt: {
    type: Date,
    required: [true, 'Unblock time is required'],
  },
  reason: {
    type: String,
    default: '',
  },
  attackType: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  unblockedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('BlockedIp', blockedIpSchema);
