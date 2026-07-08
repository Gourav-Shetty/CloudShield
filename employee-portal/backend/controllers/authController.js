const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendLog } = require('../config/logClient');

const getClientIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '';
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1';
  }
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 * @vuln    No rate limiting — intentional for brute-force / credential-stuffing demos
 */
const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'employee',
    });

    // Log the registration event
    sendLog({
      ip: getClientIp(req),
      method: req.method,
      endpoint: req.originalUrl,
      status: 201,
      userAgent: req.headers['user-agent'],
      eventType: 'Registration',
      payload: { username, email, role: user.role },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
};

/**
 * @desc    Login user & return JWT
 * @route   POST /api/auth/login
 * @access  Public
 * @vuln    No rate limiting — intentional for brute-force demos
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password',
      });
    }

    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      sendLog({
        ip: getClientIp(req),
        method: req.method,
        endpoint: req.originalUrl,
        status: 401,
        userAgent: req.headers['user-agent'],
        eventType: 'LoginFailure',
        payload: { username, reason: 'User not found' },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      sendLog({
        ip: getClientIp(req),
        method: req.method,
        endpoint: req.originalUrl,
        status: 403,
        userAgent: req.headers['user-agent'],
        eventType: 'LoginLocked',
        payload: { username },
      });

      return res.status(403).json({
        success: false,
        message: 'Account locked. Please contact an administrator.',
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      sendLog({
        ip: getClientIp(req),
        method: req.method,
        endpoint: req.originalUrl,
        status: 401,
        userAgent: req.headers['user-agent'],
        eventType: 'LoginFailure',
        payload: { username, reason: 'Invalid password' },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Save login IP to user record
    user.lastLoginIP = getClientIp(req);
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '24h' }
    );

    sendLog({
      ip: getClientIp(req),
      method: req.method,
      endpoint: req.originalUrl,
      status: 200,
      userAgent: req.headers['user-agent'],
      eventType: 'LoginSuccess',
      payload: { username, role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

module.exports = { register, login };
