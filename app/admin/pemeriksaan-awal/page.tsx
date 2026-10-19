// app/admin/pemeriksaan-awal/page.tsx — Daftar booking yang menunggu pemeriksaan awal

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pemeriksaan Awal' }
export const dynamic = 'force-dynamic'

export default async function PemeriksaanAwalPage() {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT'] },
      deletedAt: null,
    },
    orderBy: { departureDatetime: 'asc' },
    include: {
      vehicle: { select: { name: true, plateNumber: true } },
      inspections: { where: { type: 'PRE' }, select: { id: true, odometer: true, submittedAt: true } },
    },
  })

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const STATUS_LABELS: Record<string, string> = {
    DISETUJUI: 'Disetujui — Belum Periksa',
    MENUNGGU_PEMERIKSAAN_AWAL: 'Menunggu Unggah Bukti',
    SIAP_BERANGKAT: 'Siap Berangkat ✅',
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🔍 Pemeriksaan Awal</h1>
        <p className="page-subtitle">Booking yang disetujui dan menunggu pemeriksaan kendaraan sebelum berangkat.</p>
      </div>

      {bookings.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">Tidak ada booking yang menunggu pemeriksaan awal</div>
        </div></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pemohon</th>
                <th>Kendaraan</th>
                <th>Tujuan</th>
                <th>Berangkat</th>
                <th>Status</th>
                <th>Bukti Awal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => {
                const preInsp = b.inspections[0]
                return (
                  <tr key={b.id}>
                    <td>
                      <Link href={`/admin/pengajuan/${b.id}`} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                        {b.bookingCode}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{b.applicantName}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{b.vehicle.name} ({b.vehicle.plateNumber})</td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>{b.destinationName}</td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(b.departureDatetime)}</td>
                    <td>
                      <span className={`badge ${b.status === 'SIAP_BERANGKAT' ? 'status-ready' : 'status-inspection'}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td>
                      {preInsp ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
                          ✅ Km: {preInsp.odometer?.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>Belum ada</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/admin/pengajuan/${b.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: '0.75rem' }}>
                        Detail
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
