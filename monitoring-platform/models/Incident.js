const mongoose = require('mongoose');
const crypto = require('crypto');

const incidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    unique: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Investigating', 'Resolved'],
    default: 'Open',
  },
  severity: {
    type: String,
    default: 'High',
  },
  relatedAlerts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
    },
  ],
  actionsTaken: [
    {
      action: { type: String },
      timestamp: { type: Date, default: Date.now },
      details: { type: String },
    },
  ],
  sourceIP: {
    type: String,
  },
  attackType: {
    type: String,
  },
  resolvedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Auto-generate a unique INC-XXXX identifier before saving.
 */
incidentSchema.pre('save', async function (next) {
  if (!this.incidentId) {
    const count = await mongoose.model('Incident').countDocuments();
    const seq = String(count + 1).padStart(4, '0');
    this.incidentId = `INC-${seq}`;
  }
  next();
});

module.exports = mongoose.model('Incident', incidentSchema);
