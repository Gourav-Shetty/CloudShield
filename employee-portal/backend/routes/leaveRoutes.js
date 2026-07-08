const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus } = require('../controllers/leaveController');

// POST /api/leaves
router.post('/', applyLeave);

// GET /api/leaves
router.get('/', getLeaves);

// PUT /api/leaves/:id
router.put('/:id', updateLeaveStatus);

module.exports = router;
