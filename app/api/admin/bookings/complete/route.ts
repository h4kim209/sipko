// app/api/admin/bookings/complete/route.ts
// POST — Selesaikan booking (admin review bukti pengembalian → SELESAI)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { getWhatsAppAdapter, WA_TEMPLATES } from '@/adapters/whatsapp'

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const { bookingId, inspectionId } = await request.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId wajib.' }, { status: 400 })

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        status: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
        deletedAt: null,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan atau status tidak valid.' }, { status: 404 })
    }

    // Mark inspection as ACCEPTED if provided
    if (inspectionId) {
      await prisma.vehicleInspection.update({
        where: { id: inspectionId },
        data: {
          reviewAction: 'APPROVED',
          reviewedById: session.user?.id,
          reviewedAt: new Date(),
        },
      })
    }

    // Update booking → SELESAI, return vehicle
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'SELESAI' },
      }),
      prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { status: 'AVAILABLE' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          actorName: session.user?.name || 'Admin',
          actorRole: session.user?.role,
          fromStatus: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
          toStatus: 'SELESAI',
          notes: 'Bukti pengembalian diterima, booking selesai.',
        },
      }),
    ])

    // Update vehicle odometer from POST inspection
    const postInsp = await prisma.vehicleInspection.findFirst({
      where: { bookingId, type: 'POST' },
      orderBy: { createdAt: 'desc' },
    })
    if (postInsp?.odometer) {
      await prisma.vehicle.update({
        where: { id: booking.vehicleId },
        data: { currentOdometer: postInsp.odometer },
      })
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
      entityType: 'booking',
      entityId: bookingId,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { status: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN' },
      newValue: { status: 'SELESAI' },
    })

    // WA notification: booking complete
    try {
      const wa = getWhatsAppAdapter()
      const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'
      const msg = WA_TEMPLATES.bookingCompleted({
        nama: booking.applicantName,
        kode_booking: booking.bookingCode,
        tujuan: booking.destinationName,
        app_url: appUrl,
      })
      await prisma.notification.create({
        data: {
          bookingId,
          recipientPhone: booking.applicantPhoneWa,
          eventType: 'BOOKING_COMPLETED',
          messageBody: msg,
          status: 'QUEUED',
        },
      })
      const result = await wa.sendMessage(booking.applicantPhoneWa, msg)
      await prisma.notification.updateMany({
        where: { bookingId, eventType: 'BOOKING_COMPLETED' },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerMessageId: result.providerMessageId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        },
      })
    } catch (waErr) {
      console.error('[WA Complete Error]', waErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Complete Booking Error]', err)
    return NextResponse.json({ error: 'Gagal menyelesaikan booking.' }, { status: 500 })
  }
}
