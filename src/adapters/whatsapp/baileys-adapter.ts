// src/adapters/whatsapp/baileys-adapter.ts
// Baileys WhatsApp adapter dengan Global Singleton & Robust Session Lifecycle

import pino from 'pino'
import fs from 'fs'
import path from 'path'
import type { WhatsAppAdapter, WaSendResult } from './types'

export type BaileysConnectionState = 'CONNECTED' | 'CONNECTING' | 'QR_PENDING' | 'DISCONNECTED'

export type BaileysConnection = {
  state: BaileysConnectionState
  sock: any | null
  qr: string | null
  phoneConnected: string | null
  lastError: string | null
}

interface GlobalBaileysContainer {
  connection: BaileysConnection
  adapterInstance: BaileysWhatsAppAdapter | null
  isInitializing: boolean
}

// Global container agar singleton bertahan melintasi Next.js Dev HMR dan API Routes
const globalForBaileys = globalThis as unknown as {
  __baileysContainer?: GlobalBaileysContainer
}

if (!globalForBaileys.__baileysContainer) {
  globalForBaileys.__baileysContainer = {
    connection: {
      state: 'DISCONNECTED',
      sock: null,
      qr: null,
      phoneConnected: null,
      lastError: null,
    },
    adapterInstance: null,
    isInitializing: false,
  }
}

const container = globalForBaileys.__baileysContainer

/** Helper membersihkan file sesi WhatsApp jika rusak/logout */
export function clearSessionDir(dir: string) {
  if (!fs.existsSync(dir)) return
  try {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      try {
        const fullPath = path.join(dir, file)
        if (fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true })
        } else {
          fs.unlinkSync(fullPath)
        }
      } catch (err) {
        console.warn(`[Baileys] Gagal menghapus file ${file}:`, err)
      }
    }
    console.log('[Baileys] Direktori sesi berhasil dibersihkan.')
  } catch (err) {
    console.error('[Baileys] Gagal membersihkan folder sesi:', err)
  }
}

/** Normalisasi nomor Indonesia: 0812.. / +62812.. / 62812.. -> 62812.. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = '62' + digits.slice(1)
  else if (digits.startsWith('8')) digits = '62' + digits
  return digits
}

export class BaileysWhatsAppAdapter implements WhatsAppAdapter {
  async initialize(): Promise<void> {
    if (container.isInitializing) {
      console.log('[Baileys] Sedang dalam proses inisialisasi, skip duplicate init.')
      return
    }

    if (container.connection.state === 'CONNECTED' && container.connection.sock) {
      return
    }

    const sessionDir = process.env.WA_SESSION_DIR
    if (!sessionDir) {
      console.warn('[Baileys] WA_SESSION_DIR tidak dikonfigurasi. WhatsApp tidak aktif.')
      container.connection.state = 'DISCONNECTED'
      return
    }

    container.isInitializing = true
    container.connection.state = 'CONNECTING'
    container.connection.lastError = null

    try {
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true })
      }

      // Deteksi jika kredensial sebelumnya corrupt / belum teregistrasi
      const credsPath = path.join(sessionDir, 'creds.json')
      if (fs.existsSync(credsPath)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
          if (creds && creds.registered === false) {
            console.warn('[Baileys] Kredensial lama belum selesai didaftarkan (registered=false). Membersihkan sesi lama agar QR baru dapat digenerate...')
            clearSessionDir(sessionDir)
          }
        } catch {
          clearSessionDir(sessionDir)
        }
      }

      // Lazy import Baileys
      const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
      } = await import('@whiskeysockets/baileys')

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

      let version = undefined
      try {
        const v = await fetchLatestBaileysVersion()
        version = v.version
      } catch (verErr) {
        console.warn('[Baileys] Menggunakan versi internal Baileys:', verErr)
      }

      // Tutup socket lama bila ada
      if (container.connection.sock) {
        try {
          container.connection.sock.ev.removeAllListeners('connection.update')
          container.connection.sock.ev.removeAllListeners('creds.update')
          container.connection.sock.end(new Error('Resetting socket'))
        } catch {}
        container.connection.sock = null
      }

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: process.env.WA_LOG_LEVEL || 'warn' }) as any,
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      })

      container.connection.sock = sock

      sock.ev.on('connection.update', (update: any) => {
        const { connection: conn, lastDisconnect, qr } = update

        if (qr) {
          container.connection.qr = qr
          container.connection.state = 'QR_PENDING'
          console.log('[Baileys] 📱 QR Code baru siap dipindai di /admin/whatsapp')
        }

        if (conn === 'open') {
          container.connection.state = 'CONNECTED'
          container.connection.qr = null
          container.connection.lastError = null

          const me = sock.user
          container.connection.phoneConnected = me?.id ? normalizePhone(me.id.split(':')[0]) : null
          console.log(`[Baileys] ✅ WhatsApp TERHUBUNG! Nomor: ${container.connection.phoneConnected || me?.name || 'Aktif'}`)
        }

        if (conn === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode
          const errorMsg = lastDisconnect?.error?.message || 'Connection closed'
          const isLoggedOut = statusCode === DisconnectReason.loggedOut

          console.warn(`[Baileys] Koneksi socket ditutup. Code: ${statusCode}, LoggedOut: ${isLoggedOut}, Info: ${errorMsg}`)

          container.connection.sock = null
          container.connection.lastError = errorMsg

          if (isLoggedOut) {
            console.warn('[Baileys] WhatsApp ter-logout oleh HP. Menghapus sesi lama agar bisa scan QR baru.')
            container.connection.state = 'DISCONNECTED'
            container.connection.qr = null
            container.connection.phoneConnected = null
            clearSessionDir(sessionDir)
          } else {
            // Reconnect otomatis setelah beberapa detik jika bukan logout
            container.connection.state = 'CONNECTING'
            setTimeout(() => {
              container.isInitializing = false
              this.initialize().catch(console.error)
            }, 3000)
          }
        }
      })

      sock.ev.on('creds.update', saveCreds)
    } catch (err: any) {
      console.error('[Baileys] Gagal inisialisasi:', err)
      container.connection.state = 'DISCONNECTED'
      container.connection.lastError = err?.message || 'Inisialisasi gagal'
    } finally {
      container.isInitializing = false
    }
  }

  async reconnect(resetSession = false): Promise<void> {
    const sessionDir = process.env.WA_SESSION_DIR

    try {
      if (container.connection.sock) {
        try {
          container.connection.sock.ev.removeAllListeners('connection.update')
          container.connection.sock.ev.removeAllListeners('creds.update')
          container.connection.sock.end(new Error('Manual reconnect'))
        } catch {}
      }
    } catch {}

    container.connection.sock = null
    container.connection.state = 'CONNECTING'
    container.connection.qr = null
    container.connection.phoneConnected = null
    container.isInitializing = false

    if (resetSession && sessionDir) {
      console.log('[Baileys] Menghapus direktori sesi atas permintaan admin...')
      clearSessionDir(sessionDir)
    }

    await this.initialize()
  }

  isReady(): boolean {
    return container.connection.state === 'CONNECTED' && Boolean(container.connection.sock)
  }

  getStatus(): BaileysConnectionState {
    return container.connection.state
  }

  getConnectedPhone(): string | null {
    return container.connection.phoneConnected
  }

  getLastError(): string | null {
    return container.connection.lastError
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WaSendResult> {
    if (!this.isReady() || !container.connection.sock) {
      return {
        success: false,
        status: 'FAILED',
        error: `WhatsApp tidak terhubung (status: ${container.connection.state}). Pesan tidak terkirim.`,
      }
    }

    try {
      const cleanPhone = normalizePhone(phoneNumber)
      const jid = `${cleanPhone}@s.whatsapp.net`
      const result = await container.connection.sock.sendMessage(jid, { text: message })

      return {
        success: true,
        providerMessageId: result?.key?.id,
        status: 'SENT',
      }
    } catch (err: any) {
      console.error('[Baileys Send Error]', err)
      return {
        success: false,
        status: 'FAILED',
        error: err?.message || 'Gagal mengirim pesan WhatsApp.',
      }
    }
  }

  async getQrCode(): Promise<string | null> {
    return container.connection.qr
  }
}

export function getBaileysAdapter(): BaileysWhatsAppAdapter {
  if (!container.adapterInstance) {
    container.adapterInstance = new BaileysWhatsAppAdapter()
    container.adapterInstance.initialize().catch(console.error)
  }
  return container.adapterInstance
}
