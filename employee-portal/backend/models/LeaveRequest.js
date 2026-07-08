const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  employeeName: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['sick', 'casual', 'annual', 'maternity'],
    required: [true, 'Leave type is required'],
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required'],
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required'],
  },
  reason: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedBy: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
