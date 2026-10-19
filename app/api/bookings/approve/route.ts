// app/api/bookings/approve/route.ts
// POST — Approve or reject a booking (admin/approver only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { getWhatsAppAdapter, WA_TEMPLATES } from '@/adapters/whatsapp'

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
    const trimmedNotes: string | null = typeof notes === 'string' && notes.trim() ? notes.trim() : null
    if (decision === 'REJECT' && !trimmedNotes) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 })
    }

    const booking = await prisma.booking.findFirst({
      where: { bookingCode: String(bookingCode).toUpperCase(), deletedAt: null },
    })
    if (!booking) {
      return NextResponse.json({ error: 'Booking tidak ditemukan' }, { status: 404 })
    }
    if (booking.status !== 'MENUNGGU_PERSETUJUAN') {
      return NextResponse.json({ error: 'Booking tidak berada pada status menunggu persetujuan' }, { status: 400 })
    }

    const newStatus = decision === 'APPROVE' ? 'DISETUJUI' : 'DITOLAK'

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check status dalam transaksi untuk mencegah race condition
        const latestBooking = await tx.booking.findUnique({
          where: { id: booking.id },
          select: { status: true },
        })
        if (latestBooking?.status !== 'MENUNGGU_PERSETUJUAN') {
          throw new Error('STATUS_CHANGED')
        }

        if (decision === 'APPROVE') {
          const conflict = await tx.booking.findFirst({
            where: {
              id: { not: booking.id },
              vehicleId: booking.vehicleId,
              deletedAt: null,
              status: {
                in: [
                  'DISETUJUI',
                  'MENUNGGU_PEMERIKSAAN_AWAL',
                  'SIAP_BERANGKAT',
                  'SEDANG_DIGUNAKAN',
                  'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
                  'PERLU_PERBAIKAN_BUKTI',
                ],
              },
              departureDatetime: { lt: booking.returnDatetime },
              returnDatetime: { gt: booking.departureDatetime },
            },
            select: { bookingCode: true },
          })
          if (conflict) {
            throw new Error(`CONFLICT:${conflict.bookingCode}`)
          }
        }

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: newStatus, approvalNotes: trimmedNotes },
        })
        await tx.bookingApproval.create({
          data: {
            bookingId: booking.id,
            approverId: session.user.id,
            action: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            reason: trimmedNotes,
          },
        })
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: booking.id,
            actorId: session.user.id,
            actorName: session.user.name ?? 'Petugas',
            actorRole: session.user.role,
            fromStatus: 'MENUNGGU_PERSETUJUAN',
            toStatus: newStatus,
            reason: decision === 'REJECT' ? trimmedNotes : null,
            notes: trimmedNotes || (decision === 'APPROVE' ? 'Disetujui' : 'Ditolak'),
          },
        })
      })
    } catch (txErr) {
      if (txErr instanceof Error && txErr.message === 'STATUS_CHANGED') {
        return NextResponse.json(
          { error: 'Status booking sudah berubah, refresh halaman dan coba lagi.' },
          { status: 409 }
        )
      }
      if (txErr instanceof Error && txErr.message.startsWith('CONFLICT:')) {
        const code = txErr.message.split(':')[1]
        return NextResponse.json(
          { error: `Jadwal bentrok dengan booking ${code} yang sudah disetujui.` },
          { status: 409 }
        )
      }
      throw txErr
    }

    // Audit log
    await writeAuditLog({
      action: AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
      entityType: 'booking',
      entityId: booking.id,
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      oldValue: { status: 'MENUNGGU_PERSETUJUAN' },
      newValue: { status: newStatus, notes: trimmedNotes },
    })

    // WA notification to applicant
    try {
      const wa = getWhatsAppAdapter()
      const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'
      const fmt = (d: Date) =>
        new Date(d).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      const message = decision === 'APPROVE'
        ? WA_TEMPLATES.bookingApproved({
            nama: booking.applicantName,
            kode_booking: booking.bookingCode,
            tujuan: booking.destinationName,
            waktu_pinjam: fmt(booking.departureDatetime),
            waktu_kembali: fmt(booking.returnDatetime),
            app_url: `${appUrl}/cek-booking`,
          })
        : WA_TEMPLATES.bookingRejected({
            nama: booking.applicantName,
            kode_booking: booking.bookingCode,
            waktu_pinjam: fmt(booking.departureDatetime),
            tujuan: booking.destinationName,
            alasan_penolakan: trimmedNotes || '-',
          })

      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          recipientPhone: booking.applicantPhoneWa,
          eventType: decision === 'APPROVE' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
          messageBody: message,
          status: 'QUEUED',
        },
      })

      const result = await wa.sendMessage(booking.applicantPhoneWa, message)
      await prisma.notification.updateMany({
        where: {
          bookingId: booking.id,
          eventType: decision === 'APPROVE' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
        },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerMessageId: result.providerMessageId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        },
      })
    } catch (waErr) {
      console.error('[WA Approval Notify Error]', waErr)
    }

    return NextResponse.json({ success: true, newStatus })
  } catch (err: any) {
    console.error('[Approve Booking Error]', err)
    return NextResponse.json({ error: 'Terjadi kesalahan server.' }, { status: 500 })
  }
}
