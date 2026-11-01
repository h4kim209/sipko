// server.js — Entry point Node.js / PM2 untuk deployment di aaPanel Linux
const { createServer } = require('http')
const { parse } = require('url')
const path = require('path')
const fs = require('fs')

// 1. Muat .env.local atau .env lebih awal agar variabel seperti WA_SESSION_DIR, PORT, DATABASE_URL siap sejak awal
const envLocal = path.join(__dirname, '.env.local')
const envProd = path.join(__dirname, '.env')
if (fs.existsSync(envLocal)) {
  require('dotenv').config({ path: envLocal })
} else if (fs.existsSync(envProd)) {
  require('dotenv').config({ path: envProd })
}

const next = require('next')

const dev = process.env.NODE_ENV === 'development'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, hostname, () => {
      console.log(`> SIPKO Server berjalan di http://${hostname}:${port} (mode: ${dev ? 'development' : 'production'})`)

      // 2. Auto-Warmup: Otomatis aktifkan koneksi WhatsApp dan services background saat server pertama kali hidup
      setTimeout(() => {
        try {
          const http = require('http')
          const warmUpReq = http.request(
            {
              hostname: '127.0.0.1',
              port: port,
              path: '/api/internal/warmup',
              method: 'GET',
              headers: { 'User-Agent': 'SIPKO-Auto-Boot/1.0' },
            },
            (res) => {
              console.log(`> SIPKO Auto-Warmup: WhatsApp bot standby (HTTP ${res.statusCode})`)
            }
          )
          warmUpReq.on('error', (e) => {
            console.warn('> SIPKO Auto-Warmup info:', e.message)
          })
          warmUpReq.end()
        } catch (e) {
          console.warn('> SIPKO Auto-Warmup error:', e.message)
        }
      }, 2000)
    })
})
