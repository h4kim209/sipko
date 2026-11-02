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

  // Booking dalam rentang luas (-6 bulan s.d. +6 bulan) agar navigasi bulan responsif
  const startRange = new Date()
  startRange.setMonth(startRange.getMonth() - 6)
  startRange.setDate(1)
  startRange.setHours(0, 0, 0, 0)

  const endRange = new Date()
  endRange.setMonth(endRange.getMonth() + 7)
  endRange.setDate(0)
  endRange.setHours(23, 59, 59, 999)

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
      driverName: true,
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
        <p className="page-subtitle">Pantau jadwal dan ketersediaan armada operasional dalam rentang 1 bulan penuh.</p>
      </div>
      <CalendarView vehicles={vehicles} bookings={serializedBookings} />
    </div>
  )
}
