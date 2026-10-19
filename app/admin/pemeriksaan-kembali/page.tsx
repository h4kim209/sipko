// app/admin/pemeriksaan-kembali/page.tsx — Review Bukti Pengembalian

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ReviewActions } from '@/components/admin/review-actions'

export const metadata: Metadata = { title: 'Pemeriksaan Pengembalian' }
export const dynamic = 'force-dynamic'

export default async function PemeriksaanKembaliPage() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI'] },
      deletedAt: null,
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      vehicle: { select: { name: true, plateNumber: true } },
      inspections: {
        where: { type: 'POST' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          photos: { where: { isSuperseded: false }, select: { id: true, category: true, filePath: true } },
        },
      },
    },
  })

  const preInspections = await prisma.vehicleInspection.findMany({
    where: {
      bookingId: { in: bookings.map(b => b.id) },
      type: 'PRE',
    },
    select: { bookingId: true, odometer: true },
  })

  const preMap = new Map(preInspections.map(p => [p.bookingId, p.odometer]))

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Pemeriksaan Pengembalian</h1>
          <p className="page-subtitle">
            {bookings.length > 0
              ? `${bookings.length} pengembalian menunggu pemeriksaan Anda.`
              : 'Tidak ada pengembalian yang perlu diperiksa.'}
          </p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">Semua pengembalian sudah diperiksa</div>
        </div></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {bookings.map(b => {
            const postInspection = b.inspections[0]
            const preOdometer = preMap.get(b.id)
            const actualKm = postInspection && preOdometer != null && postInspection.odometer != null
              ? postInspection.odometer - preOdometer
              : null
            const isOverdue = b.returnDatetime < new Date()

            return (
              <div key={b.id} className="card">
                <div className="card-header">
                  <div>
                    <Link href={`/admin/pengajuan/${b.id}`} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                      {b.bookingCode}
                    </Link>
                    {isOverdue && <span className="badge status-rejected" style={{ marginLeft: 'var(--space-2)' }}>⏰ Terlambat</span>}
                    {b.status === 'PERLU_PERBAIKAN_BUKTI' && <span className="badge status-revision" style={{ marginLeft: 'var(--space-2)' }}>🔄 Revisi</span>}
                  </div>
                  <span className="badge status-return">
                    {b.status === 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN' ? 'Menunggu Review' : 'Perlu Perbaikan'}
                  </span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Pemohon</div>
                      <div style={{ fontWeight: 600 }}>{b.applicantName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Kendaraan</div>
                      <div style={{ fontWeight: 500 }}>{b.vehicle.name} ({b.vehicle.plateNumber})</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Tujuan</div>
                      <div>{b.destinationName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Jadwal Kembali</div>
                      <div>{formatDate(b.returnDatetime)}</div>
                    </div>
                  </div>

                  {postInspection && (
                    <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                      <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>📸 Bukti Pengembalian</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
                        <div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Km Awal</span>
                          <div style={{ fontWeight: 600 }}>{preOdometer?.toLocaleString('id-ID') || '-'} km</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Km Akhir</span>
                          <div style={{ fontWeight: 600 }}>{postInspection.odometer?.toLocaleString('id-ID') || '-'} km</div>
                        </div>
                        <div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Jarak Aktual</span>
                          <div style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>
                            {actualKm != null ? `${actualKm.toLocaleString('id-ID')} km` : '-'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>BBM</span>
                          <div style={{ fontWeight: 500 }}>{postInspection.fuelFilled ? '✅ Terisi' : '❌ Tidak terisi'}</div>
                        </div>
                      </div>
                      {postInspection.incidentNotes && (
                        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--color-warning-50)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                          <strong>⚠️ Catatan Insiden:</strong> {postInspection.incidentNotes}
                        </div>
                      )}
                      <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                        📷 {postInspection.photos.length} foto diunggah
                      </div>
                    </div>
                  )}

                  <ReviewActions
                    bookingId={b.id}
                    bookingCode={b.bookingCode}
                    inspectionId={postInspection?.id}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
