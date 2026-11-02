// app/api/bookings/route.ts
// POST — Buat pengajuan booking baru (publik)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { generateBookingCode } from '@/lib/booking-code'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { CreateBookingSchema } from '@/lib/validators/booking'
import { getWhatsAppAdapter, WA_TEMPLATES, getApproverPhoneNumbers } from '@/adapters/whatsapp'
import { saveFile } from '@/lib/file-storage'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validasi input
    const parsed = CreateBookingSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return NextResponse.json(
        { error: firstError.message, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Cek kendaraan ada dan aktif (tidak pensiun)
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, deletedAt: null, status: { not: 'RETIRED' } },
    })
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Kendaraan tidak ditemukan atau berstatus non-aktif.' },
        { status: 400 }
      )
    }

    // Cek jadwal bentrok — pengajuan yang sudah disetujui (slot di-blokir saat disetujui)
    // Tapi kita tetap tampilkan peringatan jika ada pengajuan pending yang bertabrakan
    const conflictingApproved = await prisma.booking.findFirst({
      where: {
        vehicleId: data.vehicleId,
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
        deletedAt: null,
        OR: [
          {
            departureDatetime: { lte: new Date(data.returnDatetime) },
            returnDatetime: { gte: new Date(data.departureDatetime) },
          },
        ],
      },
    })

    if (conflictingApproved) {
      return NextResponse.json(
        {
          error: 'Kendaraan sudah dijadwalkan pada rentang waktu tersebut. Silakan pilih waktu lain.',
        },
        { status: 409 }
      )
    }

    // Generate kode booking unik
    let bookingCode: string
    let attempts = 0
    do {
      bookingCode = generateBookingCode()
      const existing = await prisma.booking.findUnique({
        where: { bookingCode },
      })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Gagal membuat kode booking. Coba lagi.' },
        { status: 500 }
      )
    }

    // Ambil alamat sekolah dari env/config
    const schoolAddress =
      process.env.SCHOOL_ADDRESS ||
      'Jl. Arief Rahman Hakim No.40, Sukarahayu, Kec. Subang, Kabupaten Subang, Jawa Barat 41212'
    const schoolLat = parseFloat(process.env.SCHOOL_LAT || '-6.5694')
    const schoolLng = parseFloat(process.env.SCHOOL_LNG || '107.7588')

    // Buat booking
    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        applicantName: data.applicantName,
        applicantNip: data.applicantNip || null,
        applicantJabatan: data.applicantJabatan,
        applicantUnit: data.applicantUnit || null,
        applicantPhoneWa: data.applicantPhoneWa,
        vehicleId: data.vehicleId,
        purposeCategory: data.purposeCategory,
        purposeNotes: data.purposeNotes || null,
        originAddress: schoolAddress,
        originLat: schoolLat,
        originLng: schoolLng,
        destinationName: data.destinationName,
        destinationAddress: data.destinationAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        routeDistanceKm: data.routeDistanceKm,
        mapProvider: data.routeDistanceKm ? 'OSM' : null,
        routeFetchedAt: data.routeDistanceKm ? new Date() : null,
        extraStops: data.extraStops?.length ? data.extraStops : Prisma.JsonNull,
        departureDatetime: new Date(data.departureDatetime),
        returnDatetime: new Date(data.returnDatetime),
        additionalNotes: data.additionalNotes || null,
        status: 'MENUNGGU_PERSETUJUAN',
      },
    })

    // Catat history status awal
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        actorName: data.applicantName,
        toStatus: 'MENUNGGU_PERSETUJUAN',
        notes: 'Pengajuan baru dibuat oleh pemohon.',
      },
    })

    // Audit log
    await writeAuditLog({
      action: AUDIT_ACTIONS.BOOKING_CREATED,
      entityType: 'booking',
      entityId: booking.id,
      actorName: data.applicantName,
      newValue: {
        bookingCode,
        destination: data.destinationName,
        departure: data.departureDatetime,
        return: data.returnDatetime,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    })

    // Format tanggal Indonesia
    const formatWaDate = (d: string) =>
      new Date(d).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

    const appUrl = process.env.APP_URL || 'https://sipko.smkn1subang.sch.id'

    // Kirim notifikasi WA ke pemohon (async, jangan gagalkan booking)
    try {
      const wa = getWhatsAppAdapter()
      const msg = WA_TEMPLATES.bookingCreatedApplicant({
        nama: data.applicantName,
        waktu_pinjam: formatWaDate(data.departureDatetime),
        waktu_kembali: formatWaDate(data.returnDatetime),
        tujuan: data.destinationName,
        jarak_km: data.routeDistanceKm?.toString() || '-',
        kode_booking: bookingCode,
        app_url: appUrl,
      })

      // Simpan notifikasi ke database
      await prisma.notification.create({
        data: {
          bookingId: booking.id,
          recipientPhone: data.applicantPhoneWa,
          eventType: 'BOOKING_CREATED_APPLICANT',
          messageBody: msg,
          status: 'QUEUED',
        },
      })

      // Kirim
      const result = await wa.sendMessage(data.applicantPhoneWa, msg)
      await prisma.notification.updateMany({
        where: { bookingId: booking.id, eventType: 'BOOKING_CREATED_APPLICANT' },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          providerMessageId: result.providerMessageId,
          attemptCount: 1,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        },
      })

      // Kirim juga ke Kepala Sekolah (APPROVER) dan Pengelola SIPKO
      const approvers = await getApproverPhoneNumbers()
      for (const approver of approvers) {
        const adminMsg = WA_TEMPLATES.bookingCreatedAdmin({
          nama_petugas: approver.name,
          nama_pemohon: data.applicantName,
          nip: data.applicantNip || '-',
          jabatan: data.applicantJabatan,
          kendaraan: vehicle ? `${vehicle.name} (${vehicle.plateNumber})` : undefined,
          waktu_pinjam: formatWaDate(data.departureDatetime),
          waktu_kembali: formatWaDate(data.returnDatetime),
          tujuan: data.destinationName,
          kode_booking: bookingCode,
          app_url: `${appUrl}/admin/pengajuan`,
        })

        await prisma.notification.create({
          data: {
            bookingId: booking.id,
            recipientPhone: approver.phone,
            eventType: 'BOOKING_CREATED_ADMIN',
            messageBody: adminMsg,
            status: 'QUEUED',
          },
        })

        const adminResult = await wa.sendMessage(approver.phone, adminMsg)
        await prisma.notification.updateMany({
          where: {
            bookingId: booking.id,
            eventType: 'BOOKING_CREATED_ADMIN',
            recipientPhone: approver.phone,
          },
          data: {
            status: adminResult.success ? 'SENT' : 'FAILED',
            providerMessageId: adminResult.providerMessageId,
            attemptCount: 1,
            lastAttemptAt: new Date(),
            errorMessage: adminResult.error,
          },
        })
      }
    } catch (waErr) {
      // WA failure TIDAK membatalkan booking
      console.error('[WA Notification Error]', waErr)
    }

    return NextResponse.json(
      {
        success: true,
        bookingCode,
        message: 'Pengajuan berhasil dibuat.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[Create Booking Error]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Coba lagi.' },
      { status: 500 }
    )
  }
}
