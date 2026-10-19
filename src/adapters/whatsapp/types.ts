// src/adapters/whatsapp/types.ts
// Interface adapter WhatsApp — agar provider dapat diganti

export interface WaSendResult {
  success: boolean
  providerMessageId?: string
  error?: string
  status: 'SENT' | 'FAILED'
}

export interface WhatsAppAdapter {
  isReady(): boolean
  sendMessage(phoneNumber: string, message: string): Promise<WaSendResult>
  getQrCode?(): Promise<string | null>
  getStatus(): 'CONNECTED' | 'CONNECTING' | 'QR_PENDING' | 'DISCONNECTED' | 'NOT_CONFIGURED'
}
