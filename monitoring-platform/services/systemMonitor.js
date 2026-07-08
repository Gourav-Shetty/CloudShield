const os = require('os');
const osu = require('os-utils');
const axios = require('axios');
const SystemStatus = require('../models/SystemStatus');

/**
 * Format seconds into a human-readable uptime string.
 */
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * Get the current CPU usage percentage via os-utils (callback-based).
 */
function getCpuUsage() {
  return new Promise((resolve) => {
    osu.cpuUsage((v) => resolve(v));
  });
}

/**
 * Collect system metrics, check service health, persist, and broadcast.
 *
 * @param {Object} io – Socket.IO server instance
 */
async function collectAndBroadcast(io) {
  try {
    // CPU
    const cpuPercent = await getCpuUsage();
    const cpu = `${(cpuPercent * 100).toFixed(1)}%`;

    // Memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = ((usedMem / totalMem) * 100).toFixed(1);
    const memory = `${memPercent}%`;

    // Uptime
    const uptime = formatUptime(os.uptime());

    // Disk — not natively available from os; report N/A
    const disk = 'N/A';

    // AI service health
    let aiService = 'unknown';
    const aiUrl = process.env.AI_SERVICE_URL;
    if (aiUrl) {
      try {
        const resp = await axios.get(`${aiUrl}/health`, { timeout: 3000 });
        aiService = resp.status === 200 ? 'running' : 'stopped';
      } catch (_) {
        aiService = 'stopped';
      }
    }

    const statusData = {
      cpu,
      memory,
      disk,
      uptime,
      nginx: 'unknown', // Cannot reliably check nginx from Node — report unknown
      backend: 'running',
      aiService,
      lastUpdated: new Date(),
    };

    // Upsert — keep only one status document
    await SystemStatus.findOneAndUpdate({}, statusData, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    if (io) {
      io.emit('system-status', statusData);
    }
  } catch (err) {
    console.error('[SystemMonitor] Error collecting status:', err.message);
  }
}

/**
 * Start the periodic system monitor.
 *
 * @param {Object} io – Socket.IO server instance
 */
function startMonitor(io) {
  console.log('[SystemMonitor] Starting periodic monitoring (30 s interval)');
  // Collect immediately, then every 30 s
  collectAndBroadcast(io);
  setInterval(() => collectAndBroadcast(io), 30_000);
}

module.exports = { startMonitor };
