// app/api/whatsapp/qr/route.ts
// GET — Status koneksi WhatsApp + QR (data URL) untuk dipindai (SUPER_ADMIN / ADMIN).
// POST — Trigger reconnect / buat QR code baru.

import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { apiAuth } from '@/lib/auth-guard'
import { getWhatsAppAdapter } from '@/adapters/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await apiAuth(['SUPER_ADMIN', 'ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const adapter = getWhatsAppAdapter() as ReturnType<typeof getWhatsAppAdapter> & {
    getStatus?: () => string
    getQrCode?: () => Promise<string | null>
    initialize?: () => Promise<void>
  }

  let status = adapter.getStatus?.() ?? 'DEV_MODE'

  // Jika status masih DISCONNECTED, coba picu inisialisasi agar QR code mulai digenerate
  if (status === 'DISCONNECTED' && typeof adapter.initialize === 'function') {
    adapter.initialize().catch(console.error)
    status = adapter.getStatus?.() ?? 'CONNECTING'
  }

  const rawQr = (await adapter.getQrCode?.()) ?? null
  const qrDataUrl = rawQr ? await QRCode.toDataURL(rawQr, { width: 320, margin: 1 }) : null

  return NextResponse.json(
    { status, qr: qrDataUrl },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST() {
  const session = await apiAuth(['SUPER_ADMIN', 'ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const adapter = getWhatsAppAdapter() as ReturnType<typeof getWhatsAppAdapter> & {
    getStatus?: () => string
    getQrCode?: () => Promise<string | null>
    reconnect?: () => Promise<void>
    initialize?: () => Promise<void>
  }

  if (typeof adapter.reconnect === 'function') {
    await adapter.reconnect()
  } else if (typeof adapter.initialize === 'function') {
    await adapter.initialize()
  }

  // Tunggu 1-2 detik agar Baileys event listener menangkap QR code
  await new Promise((r) => setTimeout(r, 1500))

  const status = adapter.getStatus?.() ?? 'CONNECTING'
  const rawQr = (await adapter.getQrCode?.()) ?? null
  const qrDataUrl = rawQr ? await QRCode.toDataURL(rawQr, { width: 320, margin: 1 }) : null

  return NextResponse.json(
    { success: true, status, qr: qrDataUrl },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
