// app/api/whatsapp/qr/route.ts
// GET — Status koneksi WhatsApp + QR (data URL) untuk dipindai (SUPER_ADMIN / ADMIN).
// POST — Reconnect / Reset sesi / Request Pairing Code.

import { NextRequest, NextResponse } from 'next/server'
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
    getConnectedPhone?: () => string | null
    getLastError?: () => string | null
  }

  let status = adapter.getStatus?.() ?? 'DEV_MODE'

  // Jika status masih DISCONNECTED, coba picu inisialisasi agar QR code mulai digenerate
  if (status === 'DISCONNECTED' && typeof adapter.initialize === 'function') {
    adapter.initialize().catch(console.error)
    status = adapter.getStatus?.() ?? 'CONNECTING'
  }

  const rawQr = (await adapter.getQrCode?.()) ?? null
  const qrDataUrl = rawQr ? await QRCode.toDataURL(rawQr, { width: 320, margin: 1 }) : null
  const phoneConnected = adapter.getConnectedPhone?.() ?? null
  const lastError = adapter.getLastError?.() ?? null

  return NextResponse.json(
    { status, qr: qrDataUrl, phoneConnected, lastError },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: NextRequest) {
  const session = await apiAuth(['SUPER_ADMIN', 'ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))

    const adapter = getWhatsAppAdapter() as ReturnType<typeof getWhatsAppAdapter> & {
      getStatus?: () => string
      getQrCode?: () => Promise<string | null>
      reconnect?: (resetSession?: boolean) => Promise<void>
      initialize?: () => Promise<void>
      getConnectedPhone?: () => string | null
      requestPairingCode?: (phoneNumber: string) => Promise<string>
    }

    // Aksi 1: Minta Pairing Code 8-Digit (Tautkan dengan nomor telepon)
    if (body.action === 'pairing_code') {
      if (!body.phone || typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'Nomor telepon wajib diisi.' }, { status: 400 })
      }
      if (typeof adapter.requestPairingCode !== 'function') {
        return NextResponse.json({ error: 'Fitur pairing code tidak tersedia pada adapter ini.' }, { status: 400 })
      }
      const pairingCode = await adapter.requestPairingCode(body.phone)
      return NextResponse.json({ success: true, pairingCode })
    }

    // Aksi 2: Reconnect / Reset Sesi Bersih
    const reset = Boolean(body?.reset)

    if (typeof adapter.reconnect === 'function') {
      await adapter.reconnect(reset)
    } else if (typeof adapter.initialize === 'function') {
      await adapter.initialize()
    }

    // Beri jeda 2 detik agar Baileys event listener menangkap update QR code
    await new Promise((r) => setTimeout(r, 2000))

    const status = adapter.getStatus?.() ?? 'CONNECTING'
    const rawQr = (await adapter.getQrCode?.()) ?? null
    const qrDataUrl = rawQr ? await QRCode.toDataURL(rawQr, { width: 320, margin: 1 }) : null
    const phoneConnected = adapter.getConnectedPhone?.() ?? null

    return NextResponse.json(
      { success: true, status, qr: qrDataUrl, phoneConnected },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: any) {
    console.error('[WhatsApp QR Route Error]', err)
    return NextResponse.json(
      { error: err?.message || 'Gagal merefresh koneksi WhatsApp.' },
      { status: 500 }
    )
  }
}
