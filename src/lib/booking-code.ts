// src/lib/booking-code.ts
// Pembuat kode booking acak dan unik format SIP-XXXXX (Total 9 karakter dengan tanda '-')

import { randomBytes } from 'crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Hindari 0,O,I,1 yang mirip

export function generateBookingCode(): string {
  // 5 karakter acak + 4 karakter 'SIP-' = tepat 9 digit/karakter dengan '-'
  const bytes = randomBytes(5)
  let code = ''
  for (const byte of bytes) {
    code += CHARSET[byte % CHARSET.length]
  }
  return `SIP-${code}`
}

// Validasi format kode booking (mendukung format 9 karakter baru serta kompatibel dengan kode lama)
export function isValidBookingCodeFormat(code: string): boolean {
  return /^SIP-[A-Z2-9]{4,8}$/i.test(code)
}

// Normalisasi kode (uppercase, trim)
export function normalizeBookingCode(code: string): string {
  return code.trim().toUpperCase()
}
