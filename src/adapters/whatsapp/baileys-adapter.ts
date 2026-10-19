// src/adapters/whatsapp/baileys-adapter.ts
// Baileys WhatsApp adapter (produksi)
// PENTING: Baileys bukan API resmi WhatsApp.
//   - Risiko: sesi bisa terputus, akun bisa dibanned jika traffic tinggi
//   - Untuk operasional jangka panjang, pertimbangkan migrasi ke WhatsApp Business API
//   - Simpan sesi di WA_SESSION_DIR (jangan di dalam proyek)
//
// Setup:
//   1. Set WA_SESSION_DIR di .env.local
//   2. Jalankan aplikasi, buka /api/whatsapp/qr untuk scan QR
//   3. Setelah terhubung, sesi tersimpan otomatis

import pino from 'pino'
import type { WhatsAppAdapter, WaSendResult } from './types'

type BaileysConnection = {
  state: 'CONNECTED' | 'CONNECTING' | 'QR_PENDING' | 'DISCONNECTED'
  sock: any | null
  qr: string | null
}

// Singleton connection — shared across requests
let connection: BaileysConnection = {
  state: 'DISCONNECTED',
  sock: null,
  qr: null,
}

/** Normalisasi nomor Indonesia: 0812.. / +62812.. / 62812.. -> 62812.. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  else if (digits.startsWith('8')) digits = '62' + digits
  return digits
}

export class BaileysWhatsAppAdapter implements WhatsAppAdapter {
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return
    this.initialized = true

    const sessionDir = process.env.WA_SESSION_DIR
    if (!sessionDir) {
      console.warn('[Baileys] WA_SESSION_DIR tidak dikonfigurasi. WhatsApp tidak aktif.')
      connection.state = 'DISCONNECTED'
      return
    }

    try {
      // Lazy import Baileys (tidak crash saat module tidak tersedia)
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
      } = await import('@whiskeysockets/baileys')

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
      const { version } = await fetchLatestBaileysVersion()

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: process.env.WA_LOG_LEVEL || 'warn' }) as any,
      })

      connection.sock = sock
      connection.state = 'CONNECTING'

      sock.ev.on('connection.update', (update: any) => {
        const { connection: conn, lastDisconnect, qr } = update

        if (qr) {
          connection.qr = qr
          connection.state = 'QR_PENDING'
          console.log('[Baileys] QR Code tersedia. Buka /api/whatsapp/qr untuk scan.')
        }

        if (conn === 'open') {
          connection.state = 'CONNECTED'
          connection.qr = null
          console.log('[Baileys] WhatsApp terhubung.')
        }

        if (conn === 'close') {
          const shouldReconnect =
            (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut
          connection.state = 'DISCONNECTED'
          console.warn('[Baileys] Terputus. Reconnect:', shouldReconnect)
          if (shouldReconnect) {
            setTimeout(() => {
              this.initialized = false
              this.initialize()
            }, 5000)
          }
        }
      })

      sock.ev.on('creds.update', saveCreds)
    } catch (err) {
      console.error('[Baileys] Gagal inisialisasi:', err)
      connection.state = 'DISCONNECTED'
    }
  }

  isReady(): boolean {
    return connection.state === 'CONNECTED'
  }

  getStatus() {
    return connection.state === 'CONNECTED'
      ? 'CONNECTED'
      : connection.state === 'QR_PENDING'
      ? 'QR_PENDING'
      : connection.state === 'CONNECTING'
      ? 'CONNECTING'
      : 'DISCONNECTED'
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WaSendResult> {
    if (!this.isReady() || !connection.sock) {
      return {
        success: false,
        status: 'FAILED',
        error: `WhatsApp tidak terhubung (status: ${connection.state}). Pesan tidak terkirim.`,
      }
    }

    try {
      const jid = `${normalizePhone(phoneNumber)}@s.whatsapp.net`
      const result = await connection.sock.sendMessage(jid, { text: message })

      return {
        success: true,
        providerMessageId: result?.key?.id,
        status: 'SENT',
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        error: err?.message || 'Gagal mengirim pesan WhatsApp.',
      }
    }
  }

  async getQrCode(): Promise<string | null> {
    return connection.qr
  }
}

// Export singleton yang diinisialisasi saat server start
let adapterInstance: BaileysWhatsAppAdapter | null = null

export function getBaileysAdapter(): BaileysWhatsAppAdapter {
  if (!adapterInstance) {
    adapterInstance = new BaileysWhatsAppAdapter()
    // Initialize di background
    adapterInstance.initialize().catch(console.error)
  }
  return adapterInstance
}
