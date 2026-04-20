const path = require('path')

module.exports = {
  apps: [
    {
      name: 'itam-backend',
      script: 'dist/index.js',
      cwd: path.join(__dirname, 'backend'),
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '127.0.0.1',
        DATABASE_URL: 'file:' + path.join(__dirname, 'backend', 'prisma', 'dev.db'),
        SERVE_STATIC: 'true',
        CORS_ORIGINS: 'http://localhost:3001',
        AUDIT_MAX_LINES: 10000,
      },
      error_file: path.join(__dirname, 'logs', 'pm2-error.log'),
      out_file: path.join(__dirname, 'logs', 'pm2-out.log'),
      log_file: path.join(__dirname, 'logs', 'pm2-combined.log'),
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
      restart_delay: 4000,
      kill_timeout: 5000,
      watch: false,
    },
  ],
}
