// app/api/bookings/cancel/route.ts
// POST — Cancel an existing booking (admin/approver only)

import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth-guard'
import { cancelBooking } from '@/lib/booking-approval-service'

export async function POST(request: NextRequest) {
  // Pastikan user terautentikasi dengan hak akses ADMIN, APPROVER, atau SUPER_ADMIN
  const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { bookingCode, bookingId, reason } = await request.json()
    if ((!bookingCode && !bookingId) || !reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ error: 'Data tidak lengkap. Alasan pembatalan wajib diisi.' }, { status: 400 })
    }

    const result = await cancelBooking({
      bookingCode,
      bookingId,
      reason: reason.trim(),
      actor: {
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      },
      source: 'WEB',
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 })
    }

    return NextResponse.json({ success: true, newStatus: result.newStatus })
  } catch (err: any) {
    console.error('[Cancel Booking Error]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server saat membatalkan booking.' }, { status: 500 })
  }
}
