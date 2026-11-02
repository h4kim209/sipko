// src/lib/booking-code.ts
// Pembuat kode booking ringkas dan mudah diingat format SIP-XXXX (4 karakter acak)

import { randomBytes } from 'crypto'

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Hindari 0,O,I,1 yang mirip

export function generateBookingCode(): string {
  // 4 karakter acak + 4 karakter 'SIP-' = SIP-XXXX (sangat mudah diingat)
  const bytes = randomBytes(4)
  let code = ''
  for (const byte of bytes) {
    code += CHARSET[byte % CHARSET.length]
  }
  return `SIP-${code}`
}

// Validasi format kode booking (mendukung format 4 karakter baru serta kompatibel dengan kode lama)
export function isValidBookingCodeFormat(code: string): boolean {
  return /^SIP-[A-Z2-9]{4,8}$/i.test(code)
}

// Normalisasi kode (uppercase, trim)
export function normalizeBookingCode(code: string): string {
  return code.trim().toUpperCase()
}
