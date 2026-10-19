// app/admin/sedang-digunakan/page.tsx — Kendaraan sedang digunakan

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sedang Digunakan' }
export const dynamic = 'force-dynamic'

export default async function SedangDigunakanPage() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: 'SEDANG_DIGUNAKAN',
      deletedAt: null,
    },
    orderBy: { actualDepartureAt: 'desc' },
    include: {
      vehicle: { select: { name: true, plateNumber: true, brand: true } },
    },
  })

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const now = new Date()

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🚗 Kendaraan Sedang Digunakan</h1>
        <p className="page-subtitle">{bookings.length} kendaraan sedang dalam perjalanan.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">🅿️</div>
          <div className="empty-state-title">Semua kendaraan tersedia</div>
          <p>Tidak ada kendaraan yang sedang digunakan saat ini.</p>
        </div></div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
          {bookings.map(b => {
            const isOverdue = b.returnDatetime < now
            return (
              <div key={b.id} className="card" style={isOverdue ? { borderColor: 'var(--color-danger)', borderWidth: '2px' } : {}}>
                <div className="card-header">
                  <Link href={`/admin/pengajuan/${b.id}`} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {b.bookingCode}
                  </Link>
                  {isOverdue && <span className="badge status-rejected">⏰ TERLAMBAT</span>}
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Pemohon</div>
                      <div style={{ fontWeight: 600 }}>{b.applicantName}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>{b.applicantJabatan}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Kendaraan</div>
                      <div style={{ fontWeight: 500 }}>{b.vehicle.brand} {b.vehicle.name}</div>
                      <div style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace' }}>{b.vehicle.plateNumber}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Tujuan</div>
                      <div>{b.destinationName}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Berangkat</div>
                        <div style={{ fontSize: 'var(--font-size-sm)' }}>{b.actualDepartureAt ? formatDate(b.actualDepartureAt) : '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Jadwal Kembali</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: isOverdue ? 'var(--color-danger)' : undefined, fontWeight: isOverdue ? 700 : undefined }}>
                          {formatDate(b.returnDatetime)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
