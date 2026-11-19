/**
 * PM2 config for VPS — ALWAYS use a single instance on 1 vCPU servers.
 *
 *   pm2 start ecosystem.config.js
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'lms-api',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        ENABLE_FRANCHISE_SCHEDULER: 'false',
        DISABLE_SERVER_PDF: 'true'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
