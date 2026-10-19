// app/api/whatsapp/test/route.ts
// POST — Kirim pesan WhatsApp uji coba ke nomor tujuan tertentu

import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth-guard'
import { getWhatsAppAdapter } from '@/adapters/whatsapp'

export async function POST(request: NextRequest) {
  const session = await apiAuth(['SUPER_ADMIN', 'ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { phone } = await request.json()
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ error: 'Nomor WhatsApp tujuan wajib diisi.' }, { status: 400 })
    }

    const wa = getWhatsAppAdapter()
    const testMessage = `*SIPKO — Uji Coba WhatsApp Gateway SMKN 1 Subang* 🚀

Halo! Ini adalah pesan verifikasi koneksi dari sistem SIPKO (Sistem Peminjaman Kendaraan Operasional SMKN 1 Subang).
Jika Anda menerima pesan ini, gateway WhatsApp telah terhubung dengan sukses dan siap digunakan untuk pengiriman notifikasi pengajuan peminjaman kendaraan!

Waktu Uji: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`

    const res = await wa.sendMessage(phone.trim(), testMessage)

    if (!res.success) {
      return NextResponse.json(
        { error: res.error || 'Gagal mengirim pesan WhatsApp.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Pesan uji coba berhasil dikirim ke nomor ${phone.trim()}!`,
      providerMessageId: res.providerMessageId,
    })
  } catch (err: any) {
    console.error('[WhatsApp Test Send Error]', err)
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan saat mengirim pesan uji coba.' },
      { status: 500 }
    )
  }
}
