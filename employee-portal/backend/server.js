const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const contactRoutes = require('./routes/contactRoutes');
const downloadRoutes = require('./routes/downloadRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import User model for seeding
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// CORS — allow all origins (intentionally permissive for the security demo)
app.use(cors());

// HTTP request logger (console)
app.use(morgan('dev'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Custom request logger — sends every request to the monitoring platform
app.use(requestLogger);

// Check if client IP is security-blocked
const checkIpBlock = require('./middleware/checkIpBlock');
app.use(checkIpBlock);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CloudShield AI Employee Portal API is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

const startServer = async () => {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads/ directory');
    }

    // Connect to MongoDB
    await connectDB();

    // Seed admin user if no users exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      await User.create({
        username: 'admin',
        email: 'admin@cloudshield.ai',
        password: hashedPassword,
        role: 'admin',
      });

      console.log('Seeded default admin user (username: admin, password: admin123)');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('  CloudShield AI — Employee Portal Backend');
      console.log(`  Server running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
