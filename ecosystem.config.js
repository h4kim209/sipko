// ecosystem.config.js — Konfigurasi PM2 untuk deployment di Linux / aaPanel
module.exports = {
  apps: [
    {
      name: 'sipko',
      script: 'server.js',
      cwd: './',
      instances: 1, // Wajib 1 instance agar sesi WhatsApp Baileys stabil & tidak bentrok
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1024M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
}
