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
app.get('/ai/detections', (req, res, next) => { req.url = '/detections'; analyzeRoutes(req, res, next); });

// Mount incident routes at /incidents
app.use('/incidents', incidentRoutes);

// Mount block routes — backend serves these paths
app.use('/blocked-ips', blockRoutes);
app.use('/block-ip', (req, res, next) => {
  req.url = '/';
  blockRoutes(req, res, next);
});

// Dashboard frontend calls /ip/blocks, /ip/block, /ip/unblock — alias them
app.get('/ip/blocks', (req, res, next) => { req.url = '/'; blockRoutes(req, res, next); });
app.post('/ip/block', (req, res, next) => { req.url = '/'; blockRoutes(req, res, next); });
app.post('/ip/unblock', async (req, res) => {
  try {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });
    const ioInstance = req.app.get('io');
    const { manualUnblock } = require('./services/incidentResponse');
    const result = await manualUnblock(ip, ioInstance);
    return res.json(result);
  } catch (err) {
    console.error('[IP Unblock] Error:', err.message);
    return res.status(500).json({ error: 'Unblock failed' });
  }
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
