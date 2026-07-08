const Employee = require('../models/Employee');

/**
 * @desc    Get all employees (with pagination)
 * @route   GET /api/employees
 * @access  Public
 */
const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Employee.countDocuments();
    const employees = await Employee.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get All Employees Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employees',
      error: error.message,
    });
  }
};

/**
 * @desc    Get employee by ID
 * @route   GET /api/employees/:id
 * @access  Public
 */
const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get Employee By ID Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching employee',
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new employee (employeeId auto-generated)
 * @route   POST /api/employees
 * @access  Public
 */
const createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, department, position, salary, dateOfJoining, avatar, address, status } = req.body;

    if (!firstName || !lastName || !email || !department || !position) {
      return res.status(400).json({
        success: false,
        message: 'Please provide firstName, lastName, email, department, and position',
      });
    }

    // Check for duplicate email
    const existing = await Employee.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An employee with this email already exists',
      });
    }

    const employee = await Employee.create({
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      salary,
      dateOfJoining,
      avatar,
      address,
      status,
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Create Employee Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error creating employee',
      error: error.message,
    });
  }
};

/**
 * @desc    Update employee by ID
 * @route   PUT /api/employees/:id
 * @access  Public
 */
const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Update Employee Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating employee',
      error: error.message,
    });
  }
};

/**
 * @desc    Delete employee by ID
 * @route   DELETE /api/employees/:id
 * @access  Public
 */
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully',
      data: employee,
    });
  } catch (error) {
    console.error('Delete Employee Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error deleting employee',
      error: error.message,
    });
  }
};

/**
 * @desc    Search employees
 * @route   GET /api/employees/search
 * @access  Public
 * @vuln    INTENTIONALLY VULNERABLE — user-supplied regex is passed directly
 *          to MongoDB $regex without sanitization, creating a NoSQL/ReDoS
 *          injection surface.
 */
const searchEmployees = async (req, res) => {
  try {
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search query',
      });
    }

    // VULNERABLE: unsanitized user input used directly in $regex
    const employees = await Employee.find({
      $or: [
        { firstName: { $regex: search } },
        { lastName: { $regex: search } },
        { department: { $regex: search } },
      ],
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error('Search Employees Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error searching employees',
      error: error.message,
    });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
};
