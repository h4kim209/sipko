// app/admin/pengajuan/[id]/page.tsx — Detail Booking untuk admin (lengkap)

import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth-guard'
import { ApprovalActions } from '@/components/admin/approval-actions'
import { CancelBookingAction } from '@/components/admin/cancel-booking-action'
import { InspectionGallery } from '@/components/admin/inspection-gallery'

export const metadata: Metadata = {
  title: 'Detail Booking',
}

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  MENUNGGU_PEMERIKSAAN_AWAL: 'Menunggu Pemeriksaan Awal',
  SIAP_BERANGKAT: 'Siap Berangkat',
  SEDANG_DIGUNAKAN: 'Sedang Digunakan',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'Menunggu Pemeriksaan Pengembalian',
  PERLU_PERBAIKAN_BUKTI: 'Perlu Perbaikan Bukti',
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

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  const { id } = await params

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      vehicle: true,
      approvals: {
        include: { approver: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      },
      inspections: {
        orderBy: { createdAt: 'asc' },
        include: {
          photos: { where: { isSuperseded: false }, orderBy: { uploadedAt: 'asc' } },
          submittedBy: { select: { name: true } },
          reviewedBy: { select: { name: true } },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!booking) notFound()

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDateShort = (d: Date) =>
    d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const now = new Date()
  const isOverdue = booking.returnDatetime < now &&
    !['SELESAI', 'DIBATALKAN', 'DITOLAK'].includes(booking.status)

  const preInspection = booking.inspections.find(i => i.type === 'PRE')
  const postInspection = booking.inspections.find(i => i.type === 'POST')
  const actualKm = preInspection?.odometer != null && postInspection?.odometer != null
    ? postInspection.odometer - preInspection.odometer
    : null

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Detail Booking{' '}
            <span style={{ fontFamily: 'monospace', color: 'var(--color-primary-600)' }}>
              {booking.bookingCode}
            </span>
          </h1>
          <p className="page-subtitle">
            Dibuat:{' '}
            {booking.createdAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          <span className={`badge ${STATUS_CSS[booking.status] || 'status-pending'}`} style={{ fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem' }}>
            {STATUS_LABELS[booking.status] || booking.status}
          </span>
          {isOverdue && (
            <span className="badge status-rejected" style={{ fontSize: 'var(--font-size-sm)', padding: '0.5rem 1rem' }}>
              ⏰ TERLAMBAT
            </span>
          )}
          <Link href="/admin/pengajuan" className="btn btn-secondary btn-sm">
            ← Kembali
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        {/* Informasi Pemohon */}
        <div className="card">
          <div className="card-header"><h3>👤 Data Pemohon</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {[
                { label: 'Nama', value: booking.applicantName },
                { label: 'NIP', value: booking.applicantNip || '-' },
                { label: 'Jabatan', value: booking.applicantJabatan },
                { label: 'Unit/Bagian', value: booking.applicantUnit || '-' },
                { label: 'No. WhatsApp', value: booking.applicantPhoneWa },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-2)' }}>
                  <div style={{ width: '120px', flexShrink: 0, color: 'var(--color-gray-500)', fontWeight: 500 }}>{row.label}</div>
                  <div style={{ flex: 1, fontWeight: 500 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Informasi Perjalanan */}
        <div className="card">
          <div className="card-header"><h3>🚗 Detail Perjalanan</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {[
                { label: 'Kendaraan', value: `${booking.vehicle.name} (${booking.vehicle.plateNumber})` },
                { label: 'Merek', value: `${booking.vehicle.brand} ${booking.vehicle.type}` },
                { label: 'Keperluan', value: booking.purposeCategory },
                { label: 'Tujuan', value: booking.destinationName },
                { label: 'Alamat Tujuan', value: booking.destinationAddress },
                ...(booking.routeDistanceKm ? [{ label: 'Est. Jarak', value: `${booking.routeDistanceKm} km (1 arah)` }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-2)' }}>
                  <div style={{ width: '120px', flexShrink: 0, color: 'var(--color-gray-500)', fontWeight: 500 }}>{row.label}</div>
                  <div style={{ flex: 1, fontWeight: 500 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Jadwal */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header"><h3>📅 Jadwal Perjalanan</h3></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-primary-50)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary-500)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-600)', fontWeight: 700, marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>Jadwal Berangkat</div>
              <div style={{ fontWeight: 700 }}>{formatDate(booking.departureDatetime)}</div>
            </div>
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-navy-50)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-navy)' }}>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-navy)', fontWeight: 700, marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>Jadwal Kembali</div>
              <div style={{ fontWeight: 700 }}>{formatDate(booking.returnDatetime)}</div>
            </div>
            {booking.actualDepartureAt && (
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-success-50, #f0fdf4)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-success)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)', fontWeight: 700, marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>Berangkat Aktual</div>
                <div style={{ fontWeight: 700 }}>{formatDate(booking.actualDepartureAt)}</div>
              </div>
            )}
            {booking.actualReturnAt && (
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-gray-400)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', fontWeight: 700, marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>Kembali Aktual</div>
                <div style={{ fontWeight: 700 }}>{formatDate(booking.actualReturnAt)}</div>
              </div>
            )}
            {actualKm !== null && (
              <div style={{ padding: 'var(--space-4)', background: 'var(--color-warning-50, #fffbeb)', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-warning)' }}>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', fontWeight: 700, marginBottom: 'var(--space-1)', textTransform: 'uppercase' }}>Jarak Aktual</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)' }}>{actualKm.toLocaleString('id-ID')} km</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aksi Persetujuan */}
      {booking.status === 'MENUNGGU_PERSETUJUAN' && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--color-primary-300)' }}>
          <div className="card-header">
            <h3>⚖️ Keputusan Persetujuan</h3>
          </div>
          <div className="card-body">
            {booking.purposeNotes && (
              <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                <span>📝</span>
                <div>
                  <strong>Keterangan dari Pemohon:</strong><br />{booking.purposeNotes}
                </div>
              </div>
            )}
            {booking.additionalNotes && (
              <div className="alert alert-info" style={{ marginBottom: 'var(--space-4)' }}>
                <span>💬</span>
                <div>
                  <strong>Catatan Tambahan:</strong><br />{booking.additionalNotes}
                </div>
              </div>
            )}
            <ApprovalActions bookingCode={booking.bookingCode} bookingId={booking.id} />
          </div>
        </div>
      )}

      {/* Pembatalan Pasca Persetujuan */}
      {['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT'].includes(booking.status) && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: '#fca5a5', background: '#fffafa' }}>
          <div className="card-header" style={{ borderBottomColor: '#fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: '#991b1b', margin: 0 }}>⚠️ Pembatalan Booking / Cabut Persetujuan</h3>
            <span className="badge status-approved" style={{ fontSize: 'var(--font-size-xs)' }}>
              Status: {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 'var(--font-size-sm)', color: '#7f1d1d', marginBottom: 'var(--space-3)' }}>
              Jika terjadi kesalahan persetujuan atau perubahan agenda dinas mendadak, Anda dapat membatalkan booking ini sebelum armada berangkat. Sistem akan mengosongkan alokasi kendaraan dan mengirimkan notifikasi resmi ke WhatsApp pemohon.
            </p>
            <CancelBookingAction bookingCode={booking.bookingCode} bookingId={booking.id} currentStatus={booking.status} />
          </div>
        </div>
      )}

      {/* Catatan Persetujuan */}
      {booking.approvalNotes && (
        <div className={`alert ${booking.status === 'DITOLAK' ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: 'var(--space-6)' }}>
          <span>{booking.status === 'DITOLAK' ? '❌' : 'ℹ️'}</span>
          <div>
            <strong>{booking.status === 'DITOLAK' ? 'Alasan Penolakan' : 'Catatan Persetujuan'}:</strong><br />
            {booking.approvalNotes}
          </div>
        </div>
      )}

      {/* Inspeksi */}
      {booking.inspections.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header"><h3>🔍 Data Pemeriksaan Kendaraan</h3></div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: preInspection && postInspection ? '1fr 1fr' : '1fr', gap: 'var(--space-4)' }}>
              {booking.inspections.map(insp => (
                <div key={insp.id} style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: insp.type === 'PRE' ? 'var(--color-primary-700)' : 'var(--color-navy)' }}>
                    {insp.type === 'PRE' ? '🟢 Pemeriksaan Awal' : '🔵 Pemeriksaan Kembali'}
                  </div>
                  <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--color-gray-500)' }}>Odometer</span>
                      <span style={{ fontWeight: 700 }}>{insp.odometer?.toLocaleString('id-ID') || '-'} km</span>
                    </div>
                    {insp.type === 'POST' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-gray-500)' }}>BBM Diisi</span>
                        <span style={{ fontWeight: 500 }}>{insp.fuelFilled === true ? '✅ Ya' : insp.fuelFilled === false ? '❌ Tidak' : '-'}</span>
                      </div>
                    )}
                    {insp.existingDamage && (
                      <div>
                        <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)' }}>Kerusakan Awal:</span>
                        <div style={{ fontStyle: 'italic', fontSize: 'var(--font-size-xs)' }}>{insp.existingDamage}</div>
                      </div>
                    )}
                    {insp.incidentNotes && (
                      <div>
                        <span style={{ color: 'var(--color-warning)', fontSize: 'var(--font-size-xs)' }}>⚠️ Catatan Insiden:</span>
                        <div style={{ fontStyle: 'italic', fontSize: 'var(--font-size-xs)' }}>{insp.incidentNotes}</div>
                      </div>
                    )}
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)', marginBottom: '0.25rem', fontWeight: 600 }}>
                        📷 Foto Dokumentasi ({insp.photos.length} foto):
                      </div>
                      <InspectionGallery photos={insp.photos} />
                    </div>
                    {insp.reviewAction && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-gray-500)' }}>Review</span>
                        <span className={`badge ${insp.reviewAction === 'APPROVED' ? 'status-done' : 'status-revision'}`} style={{ fontSize: '0.65rem' }}>
                          {insp.reviewAction === 'APPROVED' ? '✅ Disetujui' : '🔄 Perlu Perbaikan'}
                        </span>
                      </div>
                    )}
                    {insp.reviewNotes && (
                      <div style={{ background: 'var(--color-warning-50, #fffbeb)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                        <strong>Catatan Review:</strong> {insp.reviewNotes}
                      </div>
                    )}
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                      Disubmit: {formatDateShort(insp.submittedAt)}
                      {insp.submittedBy && ` oleh ${insp.submittedBy.name}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Status */}
      {booking.statusHistory.length > 0 && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header"><h3>📋 Riwayat Status</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {booking.statusHistory.map((h, i) => (
                <div key={h.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: i === booking.statusHistory.length - 1 ? 'var(--color-primary-600)' : 'var(--color-gray-200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 'var(--font-size-xs)', color: i === booking.statusHistory.length - 1 ? 'white' : 'var(--color-gray-600)',
                    fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                      {h.fromStatus && (
                        <span className={`badge ${STATUS_CSS[h.fromStatus] || ''}`} style={{ fontSize: '0.65rem' }}>
                          {STATUS_LABELS[h.fromStatus] || h.fromStatus}
                        </span>
                      )}
                      {h.fromStatus && <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-xs)' }}>→</span>}
                      <span className={`badge ${STATUS_CSS[h.toStatus] || ''}`} style={{ fontSize: '0.65rem' }}>
                        {STATUS_LABELS[h.toStatus] || h.toStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                      {formatDateShort(h.createdAt)} — {h.actorName}
                      {h.actorRole && ` (${h.actorRole})`}
                    </div>
                    {(h.notes || h.reason) && (
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', fontStyle: 'italic', marginTop: '2px' }}>
                        {h.notes || h.reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
