// app/admin/dashboard/page.tsx — Dashboard Admin SIPKO (Server Component)

import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Query semua stat dari database secara langsung
  const [
    pendingApproval,
    todaySchedule,
    vehiclesInUse,
    pendingReturnReview,
    overdueBookings,
    failedNotifications,
    totalBookings,
    totalCompleted,
    totalVehicles,
    recentBookings,
  ] = await Promise.all([
    // Pengajuan menunggu persetujuan
    prisma.booking.count({
      where: { status: 'MENUNGGU_PERSETUJUAN', deletedAt: null },
    }),
    // Jadwal hari ini
    prisma.booking.count({
      where: {
        departureDatetime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
        status: {
          notIn: ['DITOLAK', 'DIBATALKAN'],
        },
        deletedAt: null,
      },
    }),
    // Kendaraan sedang digunakan
    prisma.vehicle.count({
      where: { status: 'IN_USE', deletedAt: null },
    }),
    // Menunggu pemeriksaan pengembalian
    prisma.booking.count({
      where: { status: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', deletedAt: null },
    }),
    // Booking terlambat
    prisma.booking.count({
      where: {
        returnDatetime: { lt: new Date() },
        status: {
          in: ['SEDANG_DIGUNAKAN', 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN', 'PERLU_PERBAIKAN_BUKTI'],
        },
        deletedAt: null,
      },
    }),
    // Notifikasi gagal
    prisma.notification.count({
      where: { status: 'FAILED' },
    }),
    // Total booking bulan ini
    prisma.booking.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
        deletedAt: null,
      },
    }),
    // Total selesai
    prisma.booking.count({
      where: { status: 'SELESAI', deletedAt: null },
    }),
    // Total kendaraan
    prisma.vehicle.count({
      where: { deletedAt: null },
    }),
    // 5 booking terbaru
    prisma.booking.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        vehicle: { select: { name: true, plateNumber: true } },
      },
    }),
  ])

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Ringkasan sistem peminjaman kendaraan operasional SMKN 1 Subang
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <Link href="/admin/pengajuan" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon teal">📝</div>
            <div className="stat-content">
              <div className="stat-value">{pendingApproval}</div>
              <div className="stat-label">Menunggu Persetujuan</div>
            </div>
          </div>
        </Link>

        <div className="stat-card">
          <div className="stat-icon navy">📅</div>
          <div className="stat-content">
            <div className="stat-value">{todaySchedule}</div>
            <div className="stat-label">Jadwal Hari Ini</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">🚗</div>
          <div className="stat-content">
            <div className="stat-value">{vehiclesInUse}</div>
            <div className="stat-label">Kendaraan Digunakan</div>
          </div>
        </div>

        <Link href="/admin/pemeriksaan-kembali" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div className="stat-icon warning">📋</div>
            <div className="stat-content">
              <div className="stat-value">{pendingReturnReview}</div>
              <div className="stat-label">Menunggu Pemeriksaan</div>
            </div>
          </div>
        </Link>

        {overdueBookings > 0 && (
          <div className="stat-card" style={{ borderColor: 'var(--color-danger)' }}>
            <div className="stat-icon danger">⏰</div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{overdueBookings}</div>
              <div className="stat-label">Terlambat Kembali</div>
            </div>
          </div>
        )}

        {failedNotifications > 0 && (
          <div className="stat-card">
            <div className="stat-icon danger">📱</div>
            <div className="stat-content">
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{failedNotifications}</div>
              <div className="stat-label">Notifikasi Gagal</div>
            </div>
          </div>
        )}
      </div>

      {/* Ringkasan bulan ini */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-primary-600)' }}>{totalBookings}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Total Booking Bulan Ini</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-success)' }}>{totalCompleted}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Total Selesai</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-navy)' }}>{totalVehicles}</div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>Total Kendaraan</div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="card">
        <div className="card-header">
          <h3>📋 Booking Terbaru</h3>
          <Link href="/admin/riwayat" className="btn btn-secondary btn-sm">
            Lihat Semua →
          </Link>
        </div>
        <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
          {recentBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">Belum ada booking</div>
              <p>Booking baru akan muncul di sini.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Pemohon</th>
                  <th>Tujuan</th>
                  <th>Kendaraan</th>
                  <th>Berangkat</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link
                        href={`/admin/pengajuan/${b.id}`}
                        style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-600)' }}
                      >
                        {b.bookingCode}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.applicantName}</td>
                    <td>{b.destinationName}</td>
                    <td>
                      <span style={{ fontSize: 'var(--font-size-xs)' }}>
                        {b.vehicle.name} ({b.vehicle.plateNumber})
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)' }}>
                      {formatDate(b.departureDatetime)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_CSS[b.status] || 'status-pending'}`}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
