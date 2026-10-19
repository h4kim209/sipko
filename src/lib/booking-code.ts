// src/lib/booking-code.ts
// Pembuat kode booking acak dan unik format SIP-XXXXXXXX

import { randomBytes } from 'crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Hindari 0,O,I,1 yang mirip

export function generateBookingCode(): string {
  const bytes = randomBytes(8)
  let code = ''
  for (const byte of bytes) {
    code += CHARSET[byte % CHARSET.length]
  }
  return `SIP-${code}`
}

// Validasi format kode booking
export function isValidBookingCodeFormat(code: string): boolean {
  return /^SIP-[A-Z2-9]{8}$/.test(code)
}

// Normalisasi kode (uppercase, trim)
export function normalizeBookingCode(code: string): string {
  return code.trim().toUpperCase()
}
