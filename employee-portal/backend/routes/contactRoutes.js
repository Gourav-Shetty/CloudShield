const express = require('express');
const router = express.Router();
const { submitContact, getContacts, markRead } = require('../controllers/contactController');

// POST /api/contact
router.post('/', submitContact);

// GET /api/contact
router.get('/', getContacts);

// PUT /api/contact/:id
router.put('/:id', markRead);

module.exports = router;
