const mongoose = require('mongoose');

const attackHistorySchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
  },
  ipAddress: {
    type: String,
  },
  attackType: {
    type: String,
  },
  timeline: [
    {
      event: { type: String },
      timestamp: { type: Date, default: Date.now },
      details: { type: String },
    },
  ],
  summary: {
    type: String,
    default: '',
  },
  severity: {
    type: String,
    default: 'High',
  },
  ruleTriggered: {
    type: String,
    default: '',
  },
  aiThreatScore: {
    type: Number,
    default: 0,
  },
  actionsPerformed: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Auto-generate RPT-XXXX report ID before saving.
 */
attackHistorySchema.pre('save', async function (next) {
  if (!this.reportId) {
    const count = await mongoose.model('AttackHistory').countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.reportId = `RPT-${seq}`;
  }
  next();
});

module.exports = mongoose.model('AttackHistory', attackHistorySchema);
