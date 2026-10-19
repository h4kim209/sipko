// app/api/whatsapp/qr/route.ts
// GET — Status koneksi WhatsApp + QR (data URL) untuk dipindai. Khusus SUPER_ADMIN.

import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { apiAuth } from '@/lib/auth-guard'
import { getWhatsAppAdapter } from '@/adapters/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await apiAuth(['SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  const adapter = getWhatsAppAdapter() as ReturnType<typeof getWhatsAppAdapter> & {
    getStatus?: () => string
    getQrCode?: () => Promise<string | null>
  }

  const status = adapter.getStatus?.() ?? 'DEV_MODE'
  const rawQr = (await adapter.getQrCode?.()) ?? null
  const qrDataUrl = rawQr ? await QRCode.toDataURL(rawQr, { width: 320, margin: 1 }) : null

  return NextResponse.json(
    { status, qr: qrDataUrl },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
