// app/admin/riwayat/page.tsx — Riwayat semua booking

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Riwayat Peminjaman' }
export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: 'Menunggu',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  MENUNGGU_PEMERIKSAAN_AWAL: 'Pem. Awal',
  SIAP_BERANGKAT: 'Siap',
  SEDANG_DIGUNAKAN: 'Digunakan',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'Pem. Kembali',
  PERLU_PERBAIKAN_BUKTI: 'Revisi',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
}

const STATUS_CSS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: 'status-pending',
  DISETUJUI: 'status-approved',
  DITOLAK: 'status-rejected',
  MENUNGGU_PEMERIKSAAN_AWAL: 'status-inspection',
  SIAP_BERANGKAT: 'status-ready',
  SEDANG_DIGUNAKAN: 'status-active',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'status-return',
  PERLU_PERBAIKAN_BUKTI: 'status-revision',
  SELESAI: 'status-done',
  DIBATALKAN: 'status-cancelled',
}

export default async function RiwayatPage() {
  const bookings = await prisma.booking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      vehicle: { select: { name: true, plateNumber: true } },
    },
  })

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📁 Riwayat Peminjaman</h1>
          <p className="page-subtitle">Semua booking terdaftar dalam sistem.</p>
        </div>
      </div>

      <div className="table-wrapper">
        {bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">Belum ada riwayat</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pemohon</th>
                <th>Jabatan</th>
                <th>Tujuan</th>
                <th>Kendaraan</th>
                <th>Berangkat</th>
                <th>Kembali</th>
                <th>Status</th>
                <th>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/admin/pengajuan/${b.id}`} style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)', fontSize: 'var(--font-size-sm)' }}>
                      {b.bookingCode}
                    </Link>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{b.applicantName}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>{b.applicantJabatan}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{b.destinationName}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{b.vehicle.name} ({b.vehicle.plateNumber})</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(b.departureDatetime)}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(b.returnDatetime)}</td>
                  <td><span className={`badge ${STATUS_CSS[b.status] || ''}`}>{STATUS_LABELS[b.status] || b.status}</span></td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>{formatDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
