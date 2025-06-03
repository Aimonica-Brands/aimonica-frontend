module.exports = {
  apps: [
    {
      name: 'aimonica-frontend-test',
      script: 'npm',
      args: 'start',
      autorestart: true,
      combine_logs: true,
      error_file: 'logs/aimonica-frontend-test/error.log',
      max_restarts: 5,
      min_uptime: '10s',
      out_file: 'logs/aimonica-frontend-test/normal.log',
      restart_delay: 5000,
      env: {
        NEXT_PUBLIC_APP_ENV: 'development',
        PORT: 3009
      }
    }
  ]
};
