// app/api/bookings/start-trip/route.ts
// POST — Pemohon mulai perjalanan (status SIAP_BERANGKAT → SEDANG_DIGUNAKAN)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingCode, sessionToken } = body

    if (!bookingCode || !sessionToken) {
      return NextResponse.json({ error: 'Data tidak lengkap.' }, { status: 400 })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode: bookingCode.toUpperCase(),
        status: 'SIAP_BERANGKAT',
        deletedAt: null,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking tidak ditemukan atau status tidak memungkinkan memulai perjalanan.' },
        { status: 400 }
      )
    }

    // Verifikasi bahwa bukti pemeriksaan awal sudah lengkap
    const preInspection = await prisma.vehicleInspection.findFirst({
      where: {
        bookingId: booking.id,
        type: 'PRE',
      },
      include: {
        photos: { where: { isSuperseded: false } },
      },
    })

    if (!preInspection) {
      return NextResponse.json(
        { error: 'Bukti pemeriksaan awal belum diunggah.' },
        { status: 400 }
      )
    }

    // Update status
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'SEDANG_DIGUNAKAN',
          actualDepartureAt: new Date(),
        },
      }),
      // Update vehicle status
      prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'IN_USE' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          actorName: booking.applicantName,
          fromStatus: 'SIAP_BERANGKAT',
          toStatus: 'SEDANG_DIGUNAKAN',
          notes: 'Pemohon memulai perjalanan.',
        },
      }),
    ])

    await writeAuditLog({
      action: AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
      entityType: 'booking',
      entityId: booking.id,
      actorName: booking.applicantName,
      oldValue: { status: 'SIAP_BERANGKAT' },
      newValue: { status: 'SEDANG_DIGUNAKAN' },
    })

    return NextResponse.json({ success: true, message: 'Perjalanan dimulai.' })
  } catch (err: any) {
    console.error('[Start Trip Error]', err)
    return NextResponse.json(
      { error: 'Gagal memulai perjalanan.' },
      { status: 500 }
    )
  }
}
