module.exports = {
  apps: [
    {
      name: 'cointext',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3001',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    }
  ],
};
