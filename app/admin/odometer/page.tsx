// app/admin/odometer/page.tsx — Halaman Grafik Pertambahan KM & Pemakaian Armada Kendaraan

import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { VehicleOdometerChart, type VehicleOdoData, type UsagePoint } from '@/components/admin/vehicle-odometer-chart'

export const metadata: Metadata = {
  title: 'Grafik KM & Pemakaian Kendaraan',
}

export const dynamic = 'force-dynamic'

export default async function OdometerGrafikPage() {
  // Query semua kendaraan aktif beserta riwayat booking yang SELESAI
  const vehiclesRaw = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      brand: true,
      type: true,
      plateNumber: true,
      currentOdometer: true,
      status: true,
      bookings: {
        where: {
          deletedAt: null,
          status: 'SELESAI',
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          bookingCode: true,
          applicantName: true,
          destinationName: true,
          status: true,
          createdAt: true,
          departureDatetime: true,
          returnDatetime: true,
          actualReturnAt: true,
          inspections: {
            orderBy: { createdAt: 'asc' },
            select: {
              type: true,
              odometer: true,
              createdAt: true,
            },
          },
        },
      },
    },
  })

  // Format data untuk komponen grafik
  const chartData: VehicleOdoData[] = vehiclesRaw.map((v) => {
    const history: UsagePoint[] = []
    let totalKmUsed = 0

    for (const b of v.bookings) {
      const preInsp = b.inspections.find((i) => i.type === 'PRE')
      const postInsp = b.inspections.find((i) => i.type === 'POST')

      if (preInsp?.odometer && postInsp?.odometer && postInsp.odometer >= preInsp.odometer) {
        const tripDistance = postInsp.odometer - preInsp.odometer
        totalKmUsed += tripDistance
        history.push({
          bookingId: b.id,
          bookingCode: b.bookingCode,
          applicantName: b.applicantName,
          destinationName: b.destinationName,
          completedAt: (b.actualReturnAt || postInsp.createdAt || b.returnDatetime).toISOString(),
          startKm: preInsp.odometer,
          endKm: postInsp.odometer,
          tripDistance,
        })
      }
    }

    return {
      id: v.id,
      name: v.name,
      brand: v.brand,
      type: v.type,
      plateNumber: v.plateNumber,
      currentOdometer: v.currentOdometer || (history.length > 0 ? history[history.length - 1].endKm : 0),
      status: v.status,
      totalUsageKm: totalKmUsed,
      tripCount: history.length,
      history,
    }
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📈 Grafik KM Kendaraan</h1>
          <p className="page-subtitle">
            Visualisasi tren kenaikan kilometer (odometer) setiap mobil operasional berdasarkan riwayat pemakaian nyata.
          </p>
        </div>
      </div>

      <VehicleOdometerChart vehicles={chartData} />
    </div>
  )
}
