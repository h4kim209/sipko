// app/api/bookings/approve/route.ts
// POST — Approve or reject a booking (admin/approver only)

import { NextRequest, NextResponse } from 'next/server'
import { apiAuth } from '@/lib/auth-guard'
import { processBookingApproval } from '@/lib/booking-approval-service'

export async function POST(request: NextRequest) {
  // Ensure user is authenticated and has proper role
  const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { bookingCode, decision, notes } = await request.json()
    if (!bookingCode || !decision || !['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json({ error: 'Data tidak lengkap atau tidak valid' }, { status: 400 })
    }

    const result = await processBookingApproval({
      bookingCode,
      decision,
      notes,
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
    console.error('[Approve Booking Error]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
