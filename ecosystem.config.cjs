// ecosystem.config.cjs — Konfigurasi PM2 untuk deployment di Linux / aaPanel
module.exports = {
  apps: [
    {
      name: 'sipko',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: './',
      instances: 1, // Wajib 1 instance (fork) agar sesi WhatsApp Baileys konsisten & tidak konflik
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
