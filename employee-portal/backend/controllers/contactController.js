const ContactMessage = require('../models/ContactMessage');

/**
 * @desc    Submit a contact message
 * @route   POST /api/contact
 * @access  Public
 * @vuln    INTENTIONALLY VULNERABLE — message is stored AS-IS with no
 *          sanitization, enabling stored XSS when rendered on a frontend.
 */
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and message',
      });
    }

    // VULNERABLE: raw user input stored without sanitization
    const contact = await ContactMessage.create({
      name,
      email,
      subject,
      message, // stored as-is — XSS payload will persist
    });

    res.status(201).json({
      success: true,
      message: 'Message submitted successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Submit Contact Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error submitting contact message',
      error: error.message,
    });
  }
};

/**
 * @desc    Get all contact messages
 * @route   GET /api/contact
 * @access  Public
 */
const getContacts = async (req, res) => {
  try {
    const contacts = await ContactMessage.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    console.error('Get Contacts Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contact messages',
      error: error.message,
    });
  }
};

/**
 * @desc    Mark a contact message as read
 * @route   PUT /api/contact/:id
 * @access  Public
 */
const markRead = async (req, res) => {
  try {
    const contact = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: contact,
    });
  } catch (error) {
    console.error('Mark Read Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating contact message',
      error: error.message,
    });
  }
};

module.exports = { submitContact, getContacts, markRead };
