// app/api/bookings/check/route.ts
// POST — Cek status booking dengan kode + verifikasi WA

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// Rate limiting cek booking
const checkAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 20
const WINDOW_MS = 15 * 60 * 1000

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits
  return digits
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  const record = checkAttempts.get(ip)
  if (record && now - record.lastAttempt < WINDOW_MS && record.count > MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Coba lagi nanti.' },
      { status: 429 }
    )
  }
  checkAttempts.set(ip, {
    count: (record && now - record.lastAttempt < WINDOW_MS ? record.count : 0) + 1,
    lastAttempt: now,
  })

  try {
    const body = await request.json()
    const { bookingCode, phoneWa } = body

    if (!bookingCode || !phoneWa) {
      return NextResponse.json(
        { error: 'Kode booking dan nomor WhatsApp wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhone(phoneWa)

    // Cari booking — jangan beri tahu apakah kode ada atau nomor salah (anti-enumeration)
    const booking = await prisma.booking.findFirst({
      where: {
        bookingCode: bookingCode.toUpperCase(),
        applicantPhoneWa: normalizedPhone,
        deletedAt: null,
      },
      include: {
        vehicle: {
          select: { name: true, plateNumber: true, brand: true, type: true },
        },
        inspections: {
          select: {
            type: true,
            odometer: true,
            reviewAction: true,
            reviewNotes: true,
          },
        },
      },
    })

    if (!booking) {
      // Generic error — jangan bocorkan apakah kode atau nomor yang salah
      return NextResponse.json(
        { error: 'Kode booking tidak ditemukan atau nomor WhatsApp tidak cocok.' },
        { status: 404 }
      )
    }

    // Buat session token singkat untuk aksi privat
    const sessionToken = randomUUID()

    // Tentukan aksi yang tersedia
    const preInspection = booking.inspections.find((i) => i.type === 'PRE')

    const canSubmitPreInspection =
      ['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL'].includes(booking.status) &&
      !preInspection

    const canStartTrip =
      booking.status === 'SIAP_BERANGKAT' ||
      (['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL'].includes(booking.status) && !!preInspection)

    const canSubmitPostInspection =
      (booking.status === 'SEDANG_DIGUNAKAN' || booking.status === 'PERLU_PERBAIKAN_BUKTI') &&
      !booking.inspections.some(
        (i) => i.type === 'POST' && i.reviewAction !== 'NEEDS_REVISION'
      )

    const revisionInspection = booking.inspections.find(
      (i) => i.reviewAction === 'NEEDS_REVISION'
    )

    // Cek overdue
    const isOverdue =
      booking.returnDatetime < new Date() &&
      !['SELESAI', 'DIBATALKAN', 'DITOLAK'].includes(booking.status)

    return NextResponse.json({
      booking: {
        bookingCode: booking.bookingCode,
        status: booking.status,
        statusLabel: booking.status,
        applicantName: booking.applicantName,
        destinationName: booking.destinationName,
        destinationAddress: booking.destinationAddress,
        departureDatetime: booking.departureDatetime.toISOString(),
        returnDatetime: booking.returnDatetime.toISOString(),
        actualDepartureAt: booking.actualDepartureAt?.toISOString(),
        actualReturnAt: booking.actualReturnAt?.toISOString(),
        purposeCategory: booking.purposeCategory,
        purposeNotes: booking.purposeNotes,
        vehicleName: booking.vehicle.name,
        vehiclePlate: booking.vehicle.plateNumber,
        routeDistanceKm: booking.routeDistanceKm,
        isOverdue,
        canStartTrip,
        canSubmitPreInspection,
        canSubmitPostInspection,
        preInspectionStatus: preInspection?.reviewAction || null,
        revisionNotes: revisionInspection?.reviewNotes || null,
        sessionToken,
      },
    })
  } catch (err: any) {
    console.error('[Check Booking Error]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
