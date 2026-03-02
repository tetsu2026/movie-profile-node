module.exports = {
  apps: [
    {
      name: 'movie-prf-node',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      // t3.micro(1GB RAM)対策: メモリ制限
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // ログ設定
      error_file: '/var/log/pm2/movie-prf-node-error.log',
      out_file: '/var/log/pm2/movie-prf-node-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 再起動設定
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
    },
  ],
};
