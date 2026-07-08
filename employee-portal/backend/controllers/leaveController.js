const LeaveRequest = require('../models/LeaveRequest');

/**
 * @desc    Apply for leave
 * @route   POST /api/leaves
 * @access  Public
 */
const applyLeave = async (req, res) => {
  try {
    const { employeeId, employeeName, type, fromDate, toDate, reason } = req.body;

    if (!type || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide leave type, fromDate, and toDate',
      });
    }

    const leave = await LeaveRequest.create({
      employeeId,
      employeeName,
      type,
      fromDate,
      toDate,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave,
    });
  } catch (error) {
    console.error('Apply Leave Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error submitting leave request',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all leave requests (optionally filter by employeeId)
 * @route   GET /api/leaves
 * @access  Public
 */
const getLeaves = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }

    const leaves = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('employeeId', 'firstName lastName employeeId');

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves,
    });
  } catch (error) {
    console.error('Get Leaves Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching leave requests',
      error: error.message,
    });
  }
};

/**
 * @desc    Approve or reject a leave request
 * @route   PUT /api/leaves/:id
 * @access  Public
 */
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, approvedBy } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status: 'approved' or 'rejected'",
      });
    }

    const leave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, approvedBy },
      { new: true, runValidators: true }
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found',
      });
    }

    res.status(200).json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: leave,
    });
  } catch (error) {
    console.error('Update Leave Status Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating leave request',
      error: error.message,
    });
  }
};

module.exports = { applyLeave, getLeaves, updateLeaveStatus };
