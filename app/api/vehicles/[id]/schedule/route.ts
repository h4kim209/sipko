// app/api/vehicles/[id]/schedule/route.ts
// GET — Jadwal pemakaian kendaraan untuk visualisasi ketersediaan tanggal (Hijau / Merah)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID kendaraan tidak valid' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        brand: true,
        type: true,
        plateNumber: true,
        seatCapacity: true,
        status: true,
      },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan' }, { status: 404 })
    }

    // Ambil semua booking aktif mulai dari 30 hari ke belakang sampai 90 hari ke depan
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 30)

    const bookings = await prisma.booking.findMany({
      where: {
        vehicleId: id,
        deletedAt: null,
        status: {
          in: [
            'DISETUJUI',
            'MENUNGGU_PEMERIKSAAN_AWAL',
            'SIAP_BERANGKAT',
            'SEDANG_DIGUNAKAN',
            'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
            'PERLU_PERBAIKAN_BUKTI',
            'MENUNGGU_PERSETUJUAN',
          ],
        },
        departureDatetime: { lte: endDate },
        returnDatetime: { gte: startDate },
      },
      select: {
        bookingCode: true,
        applicantName: true,
        destinationName: true,
        departureDatetime: true,
        returnDatetime: true,
        status: true,
      },
      orderBy: { departureDatetime: 'asc' },
    })

    return NextResponse.json({
      vehicle,
      bookings: bookings.map((b) => ({
        ...b,
        isApproved: b.status !== 'MENUNGGU_PERSETUJUAN',
      })),
    })
  } catch (err: any) {
    console.error('[Vehicle Schedule GET Error]', err)
    return NextResponse.json({ error: 'Gagal memuat jadwal kendaraan' }, { status: 500 })
  }
}
