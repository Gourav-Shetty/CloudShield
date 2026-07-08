const express = require('express');
const router = express.Router();
const { downloadFile } = require('../controllers/downloadController');

// GET /api/download?file=<filename>
router.get('/', downloadFile);

module.exports = router;
