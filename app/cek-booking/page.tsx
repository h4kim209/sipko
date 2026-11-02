'use client'
// app/cek-booking/page.tsx — Halaman Cek Kode Booking (Publik)

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type BookingInfo = {
  bookingCode: string
  status: string
  statusLabel: string
  applicantName: string
  destinationName: string
  destinationAddress: string
  departureDatetime: string
  returnDatetime: string
  actualDepartureAt?: string
  actualReturnAt?: string
  purposeCategory: string
  purposeNotes?: string
  vehicleName: string
  vehiclePlate: string
  routeDistanceKm?: number
  isOverdue: boolean
  canStartTrip: boolean
  canSubmitPreInspection: boolean
  canSubmitPostInspection: boolean
  preInspectionStatus?: string
  postInspectionStatus?: string
  revisionNotes?: string
  sessionToken: string
}

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

const STATUS_CLASSES: Record<string, string> = {
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

export default function CekBookingPage() {
  const [bookingCode, setBookingCode] = useState('')
  const [phoneWa, setPhoneWa] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [attempts, setAttempts] = useState(0)

  // Aksi: upload bukti awal
  const [showPreInspection, setShowPreInspection] = useState(false)
  const [showPostInspection, setShowPostInspection] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  // Pre-inspection form
  const [preOdometer, setPreOdometer] = useState('')
  const [preDamageNotes, setPreDamageNotes] = useState('')
  const [prePhotos, setPrePhotos] = useState<File[]>([])
  const [preSpeedoPhoto, setPreSpeedoPhoto] = useState<File | null>(null)

  // Post-inspection form
  const [postOdometer, setPostOdometer] = useState('')
  const [postIncidentNotes, setPostIncidentNotes] = useState('')
  const [postPhotos, setPostPhotos] = useState<File[]>([])
  const [postSpeedoPhoto, setPostSpeedoPhoto] = useState<File | null>(null)
  const [fuelFilled, setFuelFilled] = useState<boolean | null>(null)
  const [fuelNotes, setFuelNotes] = useState('')
  const [fuelPhoto, setFuelPhoto] = useState<File | null>(null)

  const handleCheck = async (overrideCode?: string, overridePhone?: string) => {
    const rawCode = typeof overrideCode === 'string' ? overrideCode : bookingCode
    const rawPhone = typeof overridePhone === 'string' ? overridePhone : phoneWa
    const code = (rawCode || '').trim().toUpperCase()
    const phone = (rawPhone || '').trim()

    if (!code || !phone) {
      setError('Masukkan kode booking dan nomor WhatsApp.')
      return
    }
    if (attempts >= 15) {
      setError('Terlalu banyak percobaan. Silakan coba lagi nanti.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingCode: code,
          phoneWa: phone,
        }),
      })
      const data = await res.json()
      setAttempts((a) => a + 1)
      if (!res.ok) {
        setError(data.error || 'Kode booking tidak ditemukan atau nomor WhatsApp tidak cocok.')
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('sipko_active_booking')
        }
        return
      }
      setBooking(data.booking)
      setBookingCode(code)
      setPhoneWa(phone)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'sipko_active_booking',
          JSON.stringify({ bookingCode: code, phoneWa: phone })
        )
      }
    } catch {
      setError('Gagal memeriksa. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  // Restore status booking saat halaman direfresh
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = sessionStorage.getItem('sipko_active_booking')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.bookingCode && parsed.phoneWa) {
          setBookingCode(parsed.bookingCode)
          setPhoneWa(parsed.phoneWa)
          handleCheck(parsed.bookingCode, parsed.phoneWa)
          return
        }
      }

      // Prefill kode booking jika ada query param ?code=...
      const params = new URLSearchParams(window.location.search)
      const qCode = params.get('code')
      if (qCode) {
        setBookingCode(qCode.toUpperCase())
      }
    } catch (e) {
      console.error('[Session Restore Error]', e)
    }
  }, [])

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sipko_active_booking')
    }
    setBooking(null)
    setBookingCode('')
    setPhoneWa('')
    setError('')
    setActionMessage('')
  }

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sipko_active_booking')
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const handleStartTrip = async () => {
    if (!booking) return
    if (!confirm('Anda yakin ingin memulai perjalanan? Pastikan pemeriksaan awal telah selesai.')) return
    setActionLoading(true)
    setActionMessage('')
    try {
      const res = await fetch('/api/bookings/start-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode: booking.bookingCode, sessionToken: booking.sessionToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionMessage(data.error || 'Gagal memulai perjalanan.')
        return
      }
      setActionMessage('✅ Perjalanan dimulai!')
      // Reload booking
      handleCheck()
    } catch {
      setActionMessage('Gagal. Periksa koneksi internet.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePreInspectionSubmit = async () => {
    if (!booking) return
    if (!preOdometer || parseInt(preOdometer) < 0) {
      setActionMessage('Masukkan kilometer awal yang valid.')
      return
    }
    if (!preSpeedoPhoto) {
      setActionMessage('Foto speedometer awal wajib diunggah.')
      return
    }
    if (prePhotos.length < 3) {
      setActionMessage('Minimal 3 foto kondisi awal (interior depan, jok belakang, eksterior).')
      return
    }
    setActionLoading(true)
    setActionMessage('')
    try {
      const formData = new FormData()
      formData.append('bookingCode', booking.bookingCode)
      formData.append('sessionToken', booking.sessionToken)
      formData.append('type', 'PRE')
      formData.append('odometer', preOdometer)
      formData.append('existingDamage', preDamageNotes)
      formData.append('speedometerPhoto', preSpeedoPhoto)
      prePhotos.forEach((f) => formData.append('conditionPhotos', f))

      const res = await fetch('/api/inspections', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setActionMessage(data.error || 'Gagal mengunggah bukti.')
        return
      }
      setActionMessage('✅ Bukti pemeriksaan awal berhasil diunggah!')
      setShowPreInspection(false)
      handleCheck()
    } catch {
      setActionMessage('Gagal mengunggah. Periksa koneksi internet.')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePostInspectionSubmit = async () => {
    if (!booking) return
    if (!postOdometer || parseInt(postOdometer) < 0) {
      setActionMessage('Masukkan kilometer akhir yang valid.')
      return
    }
    if (!postSpeedoPhoto) {
      setActionMessage('Foto speedometer akhir wajib diunggah.')
      return
    }
    if (postPhotos.length < 3) {
      setActionMessage('Minimal 3 foto kondisi akhir (interior depan, jok belakang, eksterior).')
      return
    }
    if (fuelFilled === null) {
      setActionMessage('Pilih apakah Anda mengisi BBM atau tidak.')
      return
    }
    if (fuelFilled && !fuelPhoto) {
      setActionMessage('Foto bukti pengisian BBM wajib diunggah jika mengisi BBM.')
      return
    }
    if (!fuelFilled && !fuelNotes.trim()) {
      setActionMessage('Jelaskan alasan tidak mengisi BBM.')
      return
    }

    setActionLoading(true)
    setActionMessage('')
    try {
      const formData = new FormData()
      formData.append('bookingCode', booking.bookingCode)
      formData.append('sessionToken', booking.sessionToken)
      formData.append('type', 'POST')
      formData.append('odometer', postOdometer)
      formData.append('incidentNotes', postIncidentNotes)
      formData.append('fuelFilled', String(fuelFilled))
      formData.append('fuelNotes', fuelNotes)
      formData.append('speedometerPhoto', postSpeedoPhoto)
      postPhotos.forEach((f) => formData.append('conditionPhotos', f))
      if (fuelPhoto) formData.append('fuelReceiptPhoto', fuelPhoto)

      const res = await fetch('/api/inspections', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setActionMessage(data.error || 'Gagal mengunggah bukti.')
        return
      }
      setActionMessage('✅ Bukti pengembalian berhasil diunggah!')
      setShowPostInspection(false)
      handleCheck()
    } catch {
      setActionMessage('Gagal mengunggah. Periksa koneksi internet.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link href="/" className="public-nav-logo">
            <img src="/logo-circle.png" alt="SIPKO Logo" className="nav-logo-img" />
            <div>
              <div className="nav-logo-title">SIPKO</div>
              <div className="nav-logo-subtitle">SMKN 1 Subang</div>
            </div>
          </Link>
          <Link href="/" onClick={handleGoHome} className="btn btn-secondary btn-sm">← Beranda</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            🔍 Cek Status Booking
          </h1>
          <p style={{ color: 'var(--color-gray-500)' }}>
            Masukkan kode booking dan nomor WhatsApp yang didaftarkan saat pengajuan.
          </p>
        </div>

        {!booking ? (
          <div className="card animate-slide-up">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Kode Booking <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Contoh: SIP-ABCD"
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheck()
                  }}
                  style={{ fontFamily: 'monospace', fontSize: '1.125rem', letterSpacing: '0.05em' }}
                  maxLength={12}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nomor WhatsApp <span className="required">*</span></label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={phoneWa}
                  onChange={(e) => setPhoneWa(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheck()
                  }}
                />
                <span className="form-hint">Nomor harus sama dengan yang digunakan saat pengajuan</span>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                className={`btn btn-primary btn-lg w-full${loading ? ' btn-loading' : ''}`}
                onClick={() => handleCheck()}
                disabled={loading || attempts >= 10}
              >
                {loading ? 'Memeriksa...' : '🔍 Cek Status Booking'}
              </button>

              <div className="alert alert-info" style={{ marginTop: '0.5rem' }}>
                <span>🔒</span>
                <div style={{ fontSize: '0.8rem' }}>
                  Verifikasi nomor WhatsApp diperlukan untuk melindungi privasi data peminjaman Anda. Kode booking saja tidak cukup untuk mengakses detail.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Info Booking */}
            <div className="card">
              <div className="card-header">
                <h3>📋 Detail Booking</h3>
                <span className={`badge ${STATUS_CLASSES[booking.status] || 'status-pending'}`}>
                  {STATUS_LABELS[booking.status] || booking.status}
                </span>
              </div>
              <div className="card-body">
                {booking.isOverdue && (
                  <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
                    <span>⏰</span>
                    <div><strong>Terlambat!</strong> Kendaraan telah melewati jadwal pengembalian.</div>
                  </div>
                )}

                {booking.revisionNotes && (
                  <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                    <span>📝</span>
                    <div>
                      <strong>Permintaan Perbaikan dari Admin:</strong><br />
                      {booking.revisionNotes}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {[
                    { label: 'Kode Booking', value: booking.bookingCode, mono: true },
                    { label: 'Nama Pemohon', value: booking.applicantName },
                    { label: 'Tujuan', value: booking.destinationName },
                    { label: 'Alamat Tujuan', value: booking.destinationAddress },
                    { label: 'Keperluan', value: `${booking.purposeCategory}${booking.purposeNotes ? ' — ' + booking.purposeNotes : ''}` },
                    { label: 'Kendaraan', value: `${booking.vehicleName} (${booking.vehiclePlate})` },
                    { label: 'Estimasi Jarak (1 arah)', value: booking.routeDistanceKm ? `${booking.routeDistanceKm} km` : '-' },
                    { label: 'Berangkat', value: formatDate(booking.departureDatetime) },
                    { label: 'Kembali', value: formatDate(booking.returnDatetime) },
                    ...(booking.actualDepartureAt ? [{ label: 'Berangkat Aktual', value: formatDate(booking.actualDepartureAt) }] : []),
                    ...(booking.actualReturnAt ? [{ label: 'Kembali Aktual', value: formatDate(booking.actualReturnAt) }] : []),
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '0.75rem' }}>
                      <div style={{ width: '160px', flexShrink: 0, color: 'var(--color-gray-500)', fontWeight: 500 }}>{row.label}</div>
                      <div style={{ flex: 1, color: 'var(--color-gray-800)', fontWeight: 500, fontFamily: (row as any).mono ? 'monospace' : 'inherit' }}>{row.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aksi berdasarkan status */}
            {actionMessage && (
              <div className={`alert ${actionMessage.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
                <span>{actionMessage.startsWith('✅') ? '✅' : '⚠️'}</span> {actionMessage}
              </div>
            )}

            {/* Status Informative Cards */}
            {booking.status === 'MENUNGGU_PERSETUJUAN' && (
              <div className="card">
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Menunggu Persetujuan</h3>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto' }}>
                    Pengajuan peminjaman Anda sedang ditinjau oleh pihak berwenang (Kepala Sekolah / Admin). Anda akan menerima notifikasi WhatsApp setelah pengajuan disetujui atau ditolak.
                  </p>
                </div>
              </div>
            )}

            {booking.status === 'DITOLAK' && (
              <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>❌</div>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-danger)' }}>Pengajuan Belum Disetujui</h3>
                  <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto' }}>
                    Mohon maaf, pengajuan peminjaman kendaraan belum dapat disetujui. Silakan hubungi admin sekolah jika memerlukan informasi lebih lanjut.
                  </p>
                </div>
              </div>
            )}

            {/* Tombol Upload Bukti Awal */}
            {booking.canSubmitPreInspection && !showPreInspection && (
              <div className="card" style={{ borderColor: 'var(--color-primary-400)', background: 'linear-gradient(to bottom, #f0fdfa, #ffffff)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📸</div>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-primary-800)' }}>Peminjaman Telah Disetujui!</h3>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                    Sebelum memulai perjalanan, silakan lengkapi pemeriksaan awal kendaraan dengan mencatat kilometer (odometer) awal dan mengunggah foto kondisi kebersihan kendaraan.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => setShowPreInspection(true)}>
                    📷 Lengkapi & Unggah Bukti Awal
                  </button>
                </div>
              </div>
            )}

            {/* Form Bukti Awal */}
            {showPreInspection && (
              <div className="card">
                <div className="card-header">
                  <h3>📷 Bukti Pemeriksaan Awal</h3>
                  <button className="btn-icon" onClick={() => setShowPreInspection(false)}>✕</button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Kilometer Awal (Odometer) <span className="required">*</span></label>
                    <input className="form-input" type="number" min="0" placeholder="Contoh: 45230" value={preOdometer} onChange={(e) => setPreOdometer(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foto Speedometer Awal <span className="required">*</span></label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPreSpeedoPhoto(e.target.files?.[0] || null)} />
                    <span className="form-hint">Pastikan angka odometer terbaca jelas</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foto Kondisi Kendaraan (min. 3) <span className="required">*</span></label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPrePhotos(Array.from(e.target.files || []))} />
                    <span className="form-hint">Rekomendasikan: interior/dashboard, jok belakang, eksterior/kebersihan</span>
                    <span className="form-hint" style={{ marginTop: '4px' }}>Terpilih: {prePhotos.length} foto</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Catatan Kerusakan yang Sudah Ada</label>
                    <textarea className="form-textarea" rows={2} placeholder="Catat jika ada kerusakan yang sudah ada sebelum perjalanan..." value={preDamageNotes} onChange={(e) => setPreDamageNotes(e.target.value)} />
                  </div>
                  <button className={`btn btn-primary w-full${actionLoading ? ' btn-loading' : ''}`} onClick={handlePreInspectionSubmit} disabled={actionLoading}>
                    {actionLoading ? 'Mengunggah...' : '✅ Kirim Bukti Awal'}
                  </button>
                </div>
              </div>
            )}

            {/* Tombol Mulai Perjalanan */}
            {booking.canStartTrip && (
              <div className="card" style={{ borderColor: 'var(--color-primary-500)', background: 'linear-gradient(to bottom, #ecfdf5, #ffffff)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚗</div>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-primary-800)' }}>Siap Berangkat!</h3>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                    Pemeriksaan awal telah dicatat. Tekan tombol di bawah untuk memulai perjalanan operasional Anda.
                  </p>
                  <button className={`btn btn-primary btn-lg${actionLoading ? ' btn-loading' : ''}`} onClick={handleStartTrip} disabled={actionLoading}>
                    {actionLoading ? 'Memproses...' : '🚗 Mulai Perjalanan'}
                  </button>
                </div>
              </div>
            )}

            {/* Tombol Upload Bukti Akhir */}
            {booking.canSubmitPostInspection && !showPostInspection && (
              <div className="card" style={{ borderColor: 'var(--color-warning)', background: 'linear-gradient(to bottom, #fffbeb, #ffffff)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏁</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Akhiri Perjalanan & Pengembalian</h3>
                  <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem', fontSize: '0.875rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                    Perjalanan telah selesai? Unggah foto speedometer akhir, kondisi kebersihan kendaraan, dan bukti BBM untuk proses pengembalian.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => setShowPostInspection(true)}>
                    🏁 Akhiri Perjalanan & Unggah Bukti
                  </button>
                </div>
              </div>
            )}

            {/* Form Bukti Akhir */}
            {showPostInspection && (
              <div className="card">
                <div className="card-header">
                  <h3>📷 Bukti Pengembalian Kendaraan</h3>
                  <button className="btn-icon" onClick={() => setShowPostInspection(false)}>✕</button>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="form-group">
                    <label className="form-label">Kilometer Akhir (Odometer) <span className="required">*</span></label>
                    <input className="form-input" type="number" min="0" placeholder="Contoh: 45390" value={postOdometer} onChange={(e) => setPostOdometer(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foto Speedometer Akhir <span className="required">*</span></label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPostSpeedoPhoto(e.target.files?.[0] || null)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Foto Kondisi Kendaraan (min. 3) <span className="required">*</span></label>
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setPostPhotos(Array.from(e.target.files || []))} />
                    <span className="form-hint">Sudut yang sama dengan foto awal: interior, jok belakang, eksterior</span>
                    <span className="form-hint" style={{ marginTop: '4px' }}>Terpilih: {postPhotos.length} foto</span>
                  </div>

                  <hr className="divider" />

                  <div className="form-group">
                    <label className="form-label">Apakah mengisi BBM? <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="fuelFilled" checked={fuelFilled === true} onChange={() => setFuelFilled(true)} /> Ya, mengisi BBM
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="radio" name="fuelFilled" checked={fuelFilled === false} onChange={() => setFuelFilled(false)} /> Tidak mengisi
                      </label>
                    </div>
                  </div>

                  {fuelFilled === true && (
                    <div className="form-group">
                      <label className="form-label">Foto Bukti Pengisian BBM <span className="required">*</span></label>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFuelPhoto(e.target.files?.[0] || null)} />
                    </div>
                  )}

                  {fuelFilled === false && (
                    <div className="form-group">
                      <label className="form-label">Alasan Tidak Mengisi BBM <span className="required">*</span></label>
                      <textarea className="form-textarea" rows={2} placeholder="Jelaskan alasan..." value={fuelNotes} onChange={(e) => setFuelNotes(e.target.value)} />
                    </div>
                  )}

                  <hr className="divider" />

                  <div className="form-group">
                    <label className="form-label">Catatan Insiden / Kerusakan / Kendala</label>
                    <textarea className="form-textarea" rows={2} placeholder="Catat jika ada insiden, kerusakan, atau kendala selama perjalanan..." value={postIncidentNotes} onChange={(e) => setPostIncidentNotes(e.target.value)} />
                  </div>

                  <button className={`btn btn-primary w-full${actionLoading ? ' btn-loading' : ''}`} onClick={handlePostInspectionSubmit} disabled={actionLoading}>
                    {actionLoading ? 'Mengunggah...' : '✅ Kirim Bukti Pengembalian'}
                  </button>
                </div>
              </div>
            )}

            {/* Menunggu Pemeriksaan Pengembalian */}
            {booking.status === 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN' && (
              <div className="card" style={{ borderColor: 'var(--color-navy-200, #cbd5e1)', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
                  <h3 style={{ marginBottom: '0.5rem' }}>Menunggu Pemeriksaan Pengembalian</h3>
                  <p style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto' }}>
                    Bukti pengembalian Anda telah terkirim! Admin sedang memeriksa kelengkapan bukti foto dan selisih kilometer untuk menyelesaikan peminjaman.
                  </p>
                </div>
              </div>
            )}

            {/* Selesai */}
            {booking.status === 'SELESAI' && (
              <div className="card" style={{ borderColor: 'var(--color-success)', background: 'linear-gradient(to bottom, #f0fdf4, #ffffff)' }}>
                <div className="card-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                  <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-success)' }}>Peminjaman Selesai</h3>
                  <p style={{ color: 'var(--color-gray-600)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto' }}>
                    Peminjaman kendaraan telah selesai dan telah diverifikasi oleh admin. Terima kasih telah menggunakan fasilitas kendaraan operasional sekolah dengan tertib.
                  </p>
                </div>
              </div>
            )}

            {/* Kembali */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={handleReset}>
                🔍 Cek Booking Lain
              </button>
              <Link href="/" onClick={handleGoHome} className="btn btn-secondary">
                ← Beranda
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
