module.exports = {
  apps: [{
    name: 'electroshop-web',
    script: 'npm',
    args: 'start',
    cwd: '/home/luami/www/electroshopve.com',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/luami/www/electroshopve.com/logs/error.log',
    out_file: '/home/luami/www/electroshopve.com/logs/out.log',
    log_file: '/home/luami/www/electroshopve.com/logs/combined.log',
    time: true
  }]
};
