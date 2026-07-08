// =============================================================================
// CloudShield AI — PM2 Ecosystem Configuration
// =============================================================================
// Manages the two Node.js backend services:
//   1. employee-portal      → :3000  (REST API + Auth)
//   2. monitoring-platform   → :5000  (REST API + Socket.IO)
//
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 restart all
//   pm2 logs
//   pm2 save          # persist across reboots
//   pm2 startup       # generate systemd auto-start
// =============================================================================

module.exports = {
  apps: [
    {
      name: 'employee-portal',
      cwd: '/home/ubuntu/CloudShield-AI/employee-portal/backend',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ubuntu/.pm2/logs/employee-portal-error.log',
      out_file: '/home/ubuntu/.pm2/logs/employee-portal-out.log',
      merge_logs: true
    },
    {
      name: 'monitoring-platform',
      cwd: '/home/ubuntu/CloudShield-AI/monitoring-platform',
      script: 'server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/ubuntu/.pm2/logs/monitoring-platform-error.log',
      out_file: '/home/ubuntu/.pm2/logs/monitoring-platform-out.log',
      merge_logs: true
    }
  ]
};
