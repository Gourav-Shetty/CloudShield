const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/verify-captcha
router.post('/verify-captcha', (req, res) => {
  const { sliderOffset } = req.body;

  if (sliderOffset === undefined || sliderOffset < 90) {
    return res.status(400).json({ success: false, message: 'Invalid verification slider position' });
  }

  // Generate a random single-use token
  const crypto = require('crypto');
  const token = crypto.randomBytes(16).toString('hex');

  // Register in the resolved list
  const { resolvedCaptchaTokens } = require('../middleware/checkIpBlock');
  resolvedCaptchaTokens.set(token, true);
  
  console.log('[verify-captcha] Created token:', token);
  console.log('[verify-captcha] Map keys after insert:', Array.from(resolvedCaptchaTokens.keys()));

  // Expire token in 2 minutes
  setTimeout(() => {
    resolvedCaptchaTokens.delete(token);
  }, 120_000);

  return res.json({
    success: true,
    captchaToken: token,
    message: 'Verification successful'
  });
});

module.exports = router;
