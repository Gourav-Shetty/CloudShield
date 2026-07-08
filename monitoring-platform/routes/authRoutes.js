const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const router = express.Router();

/* ------------------------------------------------------------------ */
/*  Inline AdminUser model (kept local to auth routes)                */
/* ------------------------------------------------------------------ */

const adminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

const AdminUser = mongoose.model('AdminUser', adminUserSchema);

/* ------------------------------------------------------------------ */
/*  POST /auth/login                                                   */
/* ------------------------------------------------------------------ */

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await AdminUser.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    return res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------ */
/*  POST /auth/register                                                */
/* ------------------------------------------------------------------ */

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existing = await AdminUser.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await AdminUser.create({
      username,
      password: hashed,
      role: 'admin',
    });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    return res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/* ------------------------------------------------------------------ */
/*  seedDefaultAdmin — called on server startup                        */
/* ------------------------------------------------------------------ */

async function seedDefaultAdmin() {
  try {
    const count = await AdminUser.countDocuments();
    if (count === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash('cloudshield123', salt);
      await AdminUser.create({ username: 'admin', password: hashed, role: 'admin' });
      console.log('[Auth] Default admin user created (admin / cloudshield123)');
    }
  } catch (err) {
    console.error('[Auth] Seed admin error:', err.message);
  }
}

// Attach seed function so server.js can call it
router.seedDefaultAdmin = seedDefaultAdmin;

module.exports = router;
