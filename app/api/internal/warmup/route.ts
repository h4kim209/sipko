// app/api/internal/warmup/route.ts
// Endpoint pemanasan internal yang dipanggil otomatis saat server booting
// Memastikan koneksi database dan socket WhatsApp bot langsung aktif tanpa harus menunggu admin membuka web

import { NextResponse } from 'next/server'
import { getWhatsAppAdapter } from '@/adapters/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const wa = getWhatsAppAdapter()
    if (wa && typeof (wa as any).initialize === 'function') {
      ;(wa as any).initialize().catch((err: any) => {
        console.error('[Internal Warmup] Gagal inisialisasi WhatsApp:', err)
      })
    }
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'SIPKO background services & WhatsApp bot initialized',
    })
  } catch (err: any) {
    console.error('[Internal Warmup Error]', err)
    return NextResponse.json({ status: 'ERROR', error: err?.message }, { status: 500 })
  }
}
