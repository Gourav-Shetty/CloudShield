const express = require('express');
const router = express.Router();
const { getAllUsers, getSystemStats } = require('../controllers/adminController');

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/stats
router.get('/stats', getSystemStats);

module.exports = router;
