// app/api/admin/bookings/revision/route.ts
// POST — Minta perbaikan bukti dari pemohon

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { getWhatsAppAdapter, WA_TEMPLATES } from '@/adapters/whatsapp'

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const { bookingId, inspectionId, notes } = await request.json()
    if (!bookingId || !notes?.trim()) {
      return NextResponse.json({ error: 'bookingId dan catatan revisi wajib diisi.' }, { status: 400 })
    }

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

    // Mark inspection as NEEDS_REVISION
    if (inspectionId) {
      await prisma.vehicleInspection.update({
        where: { id: inspectionId },
        data: {
          reviewAction: 'NEEDS_REVISION',
          reviewNotes: notes.trim(),
          reviewedById: session.user?.id,
          reviewedAt: new Date(),
        },
      })
    }

    // Update booking status
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'PERLU_PERBAIKAN_BUKTI' },
      }),
      prisma.bookingStatusHistory.create({
        data: {
          bookingId,
          actorName: session.user?.name || 'Admin',
          actorRole: session.user?.role,
          fromStatus: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
          toStatus: 'PERLU_PERBAIKAN_BUKTI',
          notes: `Diminta perbaikan: ${notes.trim()}`,
        },
      }),
    ])

    await writeAuditLog({
      action: AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
      entityType: 'booking',
      entityId: bookingId,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { status: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN' },
      newValue: { status: 'PERLU_PERBAIKAN_BUKTI', revisionNotes: notes.trim() },
    })

    // WA notification: revision needed
    try {
      const wa = getWhatsAppAdapter()
      const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'
      const msg = WA_TEMPLATES.revisionNeeded({
        nama: booking.applicantName,
        kode_booking: booking.bookingCode,
        catatan: notes.trim(),
        app_url: appUrl,
      })
      await prisma.notification.create({
        data: {
          bookingId,
          recipientPhone: booking.applicantPhoneWa,
          eventType: 'REVISION_NEEDED',
          messageBody: msg,
          status: 'QUEUED',
        },
      })
      const result = await wa.sendMessage(booking.applicantPhoneWa, msg)
      await prisma.notification.updateMany({
        where: { bookingId, eventType: 'REVISION_NEEDED' },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerMessageId: result.providerMessageId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        },
      })
    } catch (waErr) {
      console.error('[WA Revision Error]', waErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Revision Booking Error]', err)
    return NextResponse.json({ error: 'Gagal meminta revisi.' }, { status: 500 })
  }
}
