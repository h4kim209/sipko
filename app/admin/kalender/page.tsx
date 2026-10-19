// app/admin/kalender/page.tsx — Kalender Kendaraan

import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { CalendarView } from '@/components/admin/calendar-view'

export const metadata: Metadata = { title: 'Kalender Kendaraan' }
export const dynamic = 'force-dynamic'

export default async function KalenderPage() {
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null, status: { not: 'RETIRED' } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, plateNumber: true },
  })

  // Booking aktif/mendatang (30 hari)
  const startRange = new Date()
  startRange.setDate(startRange.getDate() - 7)
  const endRange = new Date()
  endRange.setDate(endRange.getDate() + 30)

  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { notIn: ['DITOLAK', 'DIBATALKAN'] },
      OR: [
        { departureDatetime: { gte: startRange, lte: endRange } },
        { returnDatetime: { gte: startRange, lte: endRange } },
      ],
    },
    select: {
      id: true,
      bookingCode: true,
      vehicleId: true,
      applicantName: true,
      destinationName: true,
      departureDatetime: true,
      returnDatetime: true,
      status: true,
    },
    orderBy: { departureDatetime: 'asc' },
  })

  // Serialize dates
  const serializedBookings = bookings.map(b => ({
    ...b,
    departureDatetime: b.departureDatetime.toISOString(),
    returnDatetime: b.returnDatetime.toISOString(),
  }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📅 Kalender Kendaraan</h1>
        <p className="page-subtitle">Lihat jadwal penggunaan kendaraan dalam 30 hari ke depan.</p>
      </div>
      <CalendarView vehicles={vehicles} bookings={serializedBookings} />
    </div>
  )
}
