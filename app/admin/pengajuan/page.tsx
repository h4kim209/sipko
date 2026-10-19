// app/admin/pengajuan/page.tsx — Daftar Pengajuan (untuk persetujuan admin)

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ApprovalActions } from '@/components/admin/approval-actions'

export const metadata: Metadata = { title: 'Pengajuan & Persetujuan' }
export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  MENUNGGU_PEMERIKSAAN_AWAL: 'Pemeriksaan Awal',
  SIAP_BERANGKAT: 'Siap Berangkat',
  SEDANG_DIGUNAKAN: 'Sedang Digunakan',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'Pem. Pengembalian',
  PERLU_PERBAIKAN_BUKTI: 'Perlu Perbaikan',
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

export default async function PengajuanListPage() {
  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: {
        in: [
          'MENUNGGU_PERSETUJUAN',
          'DISETUJUI',
          'MENUNGGU_PEMERIKSAAN_AWAL',
          'SIAP_BERANGKAT',
          'SEDANG_DIGUNAKAN',
          'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
          'PERLU_PERBAIKAN_BUKTI',
        ],
      },
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      vehicle: { select: { name: true, plateNumber: true } },
    },
  })

  const pendingCount = bookings.filter(b => b.status === 'MENUNGGU_PERSETUJUAN').length

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pengajuan & Persetujuan</h1>
          <p className="page-subtitle">
            {pendingCount > 0
              ? `${pendingCount} pengajuan menunggu persetujuan Anda.`
              : 'Tidak ada pengajuan yang menunggu persetujuan.'}
          </p>
        </div>
      </div>

      {/* Tab-style filters */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
        <div className="badge status-pending" style={{ fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem' }}>
          ⏳ Menunggu ({pendingCount})
        </div>
        <div className="badge status-active" style={{ fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem' }}>
          🚗 Aktif ({bookings.filter(b => ['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT', 'SEDANG_DIGUNAKAN'].includes(b.status)).length})
        </div>
        <div className="badge status-return" style={{ fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem' }}>
          📋 Review ({bookings.filter(b => ['MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI'].includes(b.status)).length})
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Tidak ada pengajuan aktif</div>
              <p>Pengajuan baru akan muncul di sini secara otomatis.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Pemohon</th>
                <th>Tujuan</th>
                <th>Kendaraan</th>
                <th>Berangkat</th>
                <th>Kembali</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className={b.status === 'MENUNGGU_PERSETUJUAN' ? 'row-highlight' : ''}>
                  <td>
                    <Link
                      href={`/admin/pengajuan/${b.id}`}
                      style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)', fontSize: 'var(--font-size-sm)' }}
                    >
                      {b.bookingCode}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{b.applicantName}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>{b.applicantJabatan}</div>
                  </td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{b.destinationName}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>
                    {b.vehicle.name}<br />{b.vehicle.plateNumber}
                  </td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(b.departureDatetime)}</td>
                  <td style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(b.returnDatetime)}</td>
                  <td>
                    <span className={`badge ${STATUS_CSS[b.status] || ''}`}>
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'MENUNGGU_PERSETUJUAN' ? (
                      <ApprovalActions bookingCode={b.bookingCode} bookingId={b.id} />
                    ) : (
                      <Link href={`/admin/pengajuan/${b.id}`} className="btn btn-secondary btn-sm">
                        Detail
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
