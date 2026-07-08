require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const logRoutes = require('./routes/logRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const alertRoutes = require('./routes/alertRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const blockRoutes = require('./routes/blockRoutes');
const reportRoutes = require('./routes/reportRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');

// Import services
const { startMonitor } = require('./services/systemMonitor');

const app = express();
const server = http.createServer(app);

// Socket.IO setup with CORS allowing all origins
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Store io instance in express app for access in routes
app.set('io', io);

// Connect to Database
connectDB().then(() => {
  // Seed default admin user if none exists
  if (authRoutes.seedDefaultAdmin) {
    authRoutes.seedDefaultAdmin();
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start periodic system monitor
startMonitor(io);

// Mount Routes
app.use('/auth', authRoutes);
app.use('/logs', logRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/alerts', alertRoutes);
app.use('/reports', reportRoutes);
app.use('/analyze', analyzeRoutes);

// Mount incident routes.
// Mounting at '/' matches '/incidents', '/incidents/:id', '/incidents/:id/resolve', and '/unlock-account'
app.use('/', incidentRoutes);

// Mount block routes.
// '/blocked-ips' handles GET /blocked-ips, DELETE /blocked-ips/:id
app.use('/blocked-ips', blockRoutes);
// Alias '/block-ip' to blockRoutes so POST /block-ip works
app.use('/block-ip', (req, res, next) => {
  req.url = '/';
  blockRoutes(req, res, next);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[Server] Monitoring Platform listening on port ${PORT}`);
});
