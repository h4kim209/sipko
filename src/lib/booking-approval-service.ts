// src/lib/booking-approval-service.ts
// Service terpadu untuk memproses persetujuan/penolakan booking
// Digunakan baik oleh Web Admin Dashboard (/api/bookings/approve) maupun WhatsApp Bot Handler

import { prisma } from '@/lib/prisma'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { getWhatsAppAdapter, WA_TEMPLATES } from '@/adapters/whatsapp'

export interface ApprovalActor {
  id: string
  name?: string | null
  role: string
}

export interface ProcessApprovalParams {
  bookingCode?: string
  bookingId?: string
  decision: 'APPROVE' | 'REJECT'
  notes?: string | null
  actor: ApprovalActor
  source?: 'WEB' | 'WHATSAPP'
}

export interface ProcessApprovalResult {
  success: boolean
  error?: string
  statusCode?: number
  booking?: any
  newStatus?: string
}

export function formatWaDate(d: Date | string): string {
  return new Date(d).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function processBookingApproval(params: ProcessApprovalParams): Promise<ProcessApprovalResult> {
  const { bookingCode, bookingId, decision, notes, actor, source = 'WEB' } = params

  if (!decision || !['APPROVE', 'REJECT'].includes(decision)) {
    return { success: false, error: 'Keputusan tidak valid (harus APPROVE atau REJECT)', statusCode: 400 }
  }

  const trimmedNotes: string | null = typeof notes === 'string' && notes.trim() ? notes.trim() : null
  if (decision === 'REJECT' && !trimmedNotes) {
    return { success: false, error: 'Alasan penolakan wajib diisi', statusCode: 400 }
  }

  // Cari booking berdasarkan bookingCode atau bookingId
  const booking = await prisma.booking.findFirst({
    where: {
      ...(bookingCode ? { bookingCode: String(bookingCode).toUpperCase() } : {}),
      ...(bookingId ? { id: bookingId } : {}),
      deletedAt: null,
    },
    include: {
      vehicle: true,
    },
  })

  if (!booking) {
    return { success: false, error: `Booking ${bookingCode || bookingId || ''} tidak ditemukan`, statusCode: 404 }
  }

  if (booking.status !== 'MENUNGGU_PERSETUJUAN') {
    return {
      success: false,
      error: `Booking ${booking.bookingCode} tidak berada pada status menunggu persetujuan (status saat ini: ${booking.status})`,
      statusCode: 400,
    }
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

      // Validasi bentrok jadwal jika disetujui & memiliki kendaraan
      if (decision === 'APPROVE' && booking.vehicleId) {
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
          approverId: actor.id,
          action: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reason: trimmedNotes,
        },
      })

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          actorId: actor.id,
          actorName: actor.name ?? 'Pejabat Penyetuju',
          actorRole: actor.role,
          fromStatus: 'MENUNGGU_PERSETUJUAN',
          toStatus: newStatus,
          reason: decision === 'REJECT' ? trimmedNotes : null,
          notes: trimmedNotes || (decision === 'APPROVE' ? `Disetujui via ${source}` : `Ditolak via ${source}`),
        },
      })
    })
  } catch (txErr) {
    if (txErr instanceof Error && txErr.message === 'STATUS_CHANGED') {
      return {
        success: false,
        error: 'Status booking sudah berubah oleh aksi lain. Silakan periksa kembali.',
        statusCode: 409,
      }
    }
    if (txErr instanceof Error && txErr.message.startsWith('CONFLICT:')) {
      const code = txErr.message.split(':')[1]
      return {
        success: false,
        error: `Jadwal bentrok dengan booking ${code} yang sudah disetujui untuk kendaraan ini.`,
        statusCode: 409,
      }
    }
    throw txErr
  }

  // Catat Audit Log
  await writeAuditLog({
    action: AUDIT_ACTIONS.BOOKING_STATUS_CHANGED,
    entityType: 'booking',
    entityId: booking.id,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    oldValue: { status: 'MENUNGGU_PERSETUJUAN' },
    newValue: { status: newStatus, notes: trimmedNotes, approvedVia: source },
  })

  // Kirim Notifikasi WhatsApp ke Pemohon
  try {
    const wa = getWhatsAppAdapter()
    const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'
    const message =
      decision === 'APPROVE'
        ? WA_TEMPLATES.bookingApproved({
            nama: booking.applicantName,
            kode_booking: booking.bookingCode,
            tujuan: booking.destinationName,
            waktu_pinjam: formatWaDate(booking.departureDatetime),
            waktu_kembali: formatWaDate(booking.returnDatetime),
            app_url: `${appUrl}/cek-booking`,
          })
        : WA_TEMPLATES.bookingRejected({
            nama: booking.applicantName,
            kode_booking: booking.bookingCode,
            waktu_pinjam: formatWaDate(booking.departureDatetime),
            tujuan: booking.destinationName,
            alasan_penolakan: trimmedNotes || '-',
          })

    const notif = await prisma.notification.create({
      data: {
        bookingId: booking.id,
        recipientPhone: booking.applicantPhoneWa,
        eventType: decision === 'APPROVE' ? 'BOOKING_APPROVED' : 'BOOKING_REJECTED',
        messageBody: message,
        status: 'QUEUED',
      },
    })

    const sendRes = await wa.sendMessage(booking.applicantPhoneWa, message)
    await prisma.notification.update({
      where: { id: notif.id },
      data: {
        status: sendRes.success ? 'SENT' : 'FAILED',
        providerMessageId: sendRes.providerMessageId,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        errorMessage: sendRes.error,
      },
    })
  } catch (waErr) {
    console.error('[WA Approval Notify Error]', waErr)
  }

  return {
    success: true,
    newStatus,
    booking,
  }
}
