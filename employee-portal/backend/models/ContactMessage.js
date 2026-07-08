const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
  },
  subject: {
    type: String,
    trim: true,
  },
  // INTENTIONALLY stored raw / unsanitized for XSS demonstration purposes
  message: {
    type: String,
    required: [true, 'Message is required'],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { collection: 'contact_messages' });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
