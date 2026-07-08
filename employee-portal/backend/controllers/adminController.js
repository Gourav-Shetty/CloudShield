const User = require('../models/User');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const ContactMessage = require('../models/ContactMessage');

/**
 * @desc    Get all users (hidden admin endpoint for user enumeration demo)
 * @route   GET /api/admin/users
 * @access  Public (intentionally — no auth middleware)
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get All Users Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users',
      error: error.message,
    });
  }
};

/**
 * @desc    Get system-wide statistics
 * @route   GET /api/admin/stats
 * @access  Public (intentionally — no auth middleware)
 */
const getSystemStats = async (req, res) => {
  try {
    const [userCount, employeeCount, leaveCount, contactCount] = await Promise.all([
      User.countDocuments(),
      Employee.countDocuments(),
      LeaveRequest.countDocuments(),
      ContactMessage.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: userCount,
        employees: employeeCount,
        leaves: leaveCount,
        contacts: contactCount,
      },
    });
  } catch (error) {
    console.error('Get System Stats Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching system stats',
      error: error.message,
    });
  }
};

module.exports = { getAllUsers, getSystemStats };
