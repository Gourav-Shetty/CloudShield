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
  restrictionType: {
    type: String,
    enum: ['Block', 'RateLimit', 'Captcha'],
    default: 'Block',
  },
  rateLimitRps: {
    type: Number,
    default: 2,
  },
  unblockedAt: {
    type: Date,
  },
}, { collection: 'blocked_ips' });

module.exports = mongoose.model('BlockedIp', blockedIpSchema);
