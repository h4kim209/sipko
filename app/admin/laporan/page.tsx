// app/admin/laporan/page.tsx — Laporan & Cetak

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ExportButtons } from '@/components/admin/export-buttons'

export const metadata: Metadata = { title: 'Laporan & Cetak' }
export const dynamic = 'force-dynamic'

export default async function LaporanPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const [
    totalThisMonth,
    completedThisMonth,
    rejectedThisMonth,
    cancelledThisMonth,
    totalThisYear,
    completedThisYear,
    topVehicles,
    topDestinations,
  ] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.booking.count({ where: { status: 'SELESAI', createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.booking.count({ where: { status: 'DITOLAK', createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.booking.count({ where: { status: 'DIBATALKAN', createdAt: { gte: monthStart }, deletedAt: null } }),
    prisma.booking.count({ where: { createdAt: { gte: yearStart }, deletedAt: null } }),
    prisma.booking.count({ where: { status: 'SELESAI', createdAt: { gte: yearStart }, deletedAt: null } }),
    prisma.booking.groupBy({
      by: ['vehicleId'],
      _count: { id: true },
      where: { createdAt: { gte: yearStart }, deletedAt: null },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.booking.groupBy({
      by: ['destinationName'],
      _count: { id: true },
      where: { createdAt: { gte: yearStart }, deletedAt: null },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ])

  // Resolve vehicle names
  const vehicleIds = topVehicles.map(v => v.vehicleId)
  const vehicleMap = new Map(
    (await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, name: true, plateNumber: true },
    })).map(v => [v.id, v])
  )

  const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🖨️ Laporan & Cetak</h1>
          <p className="page-subtitle">Ringkasan statistik dan ekspor data peminjaman kendaraan.</p>
        </div>
        <ExportButtons />
      </div>

      {/* Bulan ini */}
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-gray-700)' }}>
        📅 Bulan {monthName}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-navy)' }}>{totalThisMonth}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Total Pengajuan</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>{completedThisMonth}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Selesai</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-danger)' }}>{rejectedThisMonth}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Ditolak</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-gray-400)' }}>{cancelledThisMonth}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Dibatalkan</div>
        </div></div>
      </div>

      {/* Tahun ini */}
      <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--space-4)', color: 'var(--color-gray-700)' }}>
        📊 Tahun {now.getFullYear()}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-navy)' }}>{totalThisYear}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Total Pengajuan Tahun Ini</div>
        </div></div>
        <div className="card"><div className="card-body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>{completedThisYear}</div>
          <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Selesai Tahun Ini</div>
        </div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Top kendaraan */}
        <div className="card">
          <div className="card-header"><h3>🚗 Kendaraan Paling Sering Digunakan</h3></div>
          <div className="card-body">
            {topVehicles.length === 0 ? (
              <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>Belum ada data.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {topVehicles.map((v, i) => {
                  const vehicle = vehicleMap.get(v.vehicleId)
                  return (
                    <div key={v.vehicleId} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-700)' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{vehicle?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', fontFamily: 'monospace' }}>{vehicle?.plateNumber}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{v._count.id}x</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Top tujuan */}
        <div className="card">
          <div className="card-header"><h3>📍 Tujuan Paling Sering</h3></div>
          <div className="card-body">
            {topDestinations.length === 0 ? (
              <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>Belum ada data.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {topDestinations.map((d, i) => (
                  <div key={d.destinationName} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 'var(--font-size-xs)', color: 'var(--color-navy-700)' }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{d.destinationName}</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-navy-600)' }}>{d._count.id}x</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
