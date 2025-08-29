module.exports = {
  apps: [
    {
      name: 'aimonica-frontend',
      script: 'npm',
      args: 'start',
      autorestart: true,
      combine_logs: true,
      error_file: 'logs/aimonica-frontend/error.log',
      max_restarts: 5,
      min_uptime: '10s',
      out_file: 'logs/aimonica-frontend/normal.log',
      restart_delay: 5000,
    },
  ],
};
