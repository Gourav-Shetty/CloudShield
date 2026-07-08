const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  searchEmployees,
} = require('../controllers/employeeController');

// GET /api/employees/search — must be defined BEFORE /:id to avoid conflicts
router.get('/search', searchEmployees);

// GET /api/employees
router.get('/', getAllEmployees);

// POST /api/employees
router.post('/', createEmployee);

// GET /api/employees/:id
router.get('/:id', getEmployeeById);

// PUT /api/employees/:id
router.put('/:id', updateEmployee);

// DELETE /api/employees/:id
router.delete('/:id', deleteEmployee);

module.exports = router;
