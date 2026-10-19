// src/adapters/whatsapp/dev-adapter.ts
// Development adapter — log pesan ke console, tidak kirim WA sungguhan
// Digunakan saat WA belum dikonfigurasi atau NODE_ENV=development

import type { WhatsAppAdapter, WaSendResult } from './types'

export class DevWhatsAppAdapter implements WhatsAppAdapter {
  private status: ReturnType<WhatsAppAdapter['getStatus']> = 'NOT_CONFIGURED'

  isReady(): boolean {
    return true // Dev adapter selalu "ready" untuk tidak memblokir alur
  }

  getStatus() {
    return this.status
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WaSendResult> {
    console.log('\n========================================')
    console.log('[DEV WhatsApp] Pesan tidak dikirim — mode development')
    console.log(`[DEV WhatsApp] Tujuan: ${phoneNumber}`)
    console.log('[DEV WhatsApp] Pesan:')
    console.log(message)
    console.log('========================================\n')

    return {
      success: true,
      providerMessageId: `dev-${Date.now()}`,
      status: 'SENT',
    }
  }

  async getQrCode(): Promise<string | null> {
    return null
  }
}
