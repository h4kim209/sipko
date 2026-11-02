'use client'
// app/pengajuan/page.tsx — Form Pengajuan Peminjaman Kendaraan

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmployeeCombobox, EmployeeOption } from '@/components/booking/employee-combobox'
import { VehicleCalendarPicker } from '@/components/booking/vehicle-calendar-picker'

const CATEGORIES = [
  'Dinas Luar Kota',
  'Kunjungan Industri',
  'Rapat Koordinasi',
  'Kegiatan Siswa',
  'Pengambilan Barang',
  'Keperluan Medis/Darurat',
  'Lainnya',
]

type Vehicle = {
  id: string
  name: string
  brand: string
  type: string
  plateNumber: string
  status: string
}

type GeocodeResult = {
  displayName: string
  address: string
  lat: number
  lng: number
}

type FormData = {
  applicantName: string
  applicantNip: string
  applicantJabatan: string
  applicantUnit: string
  applicantPhoneWa: string
  vehicleId: string
  purposeCategory: string
  purposeNotes: string
  destinationName: string
  destinationAddress: string
  destinationLat?: number
  destinationLng?: number
  routeDistanceKm?: number
  departureDatetime: string
  returnDatetime: string
  additionalNotes: string
  // Manifesting & SPPD
  driverType: 'PEMOHON' | 'GURU_LAIN' | 'SUPIR_LUAR'
  driverName: string
  driverPhone: string
  passengerCount: number
  passengers: string[]
  passengerNotes: string
  hasSppd: boolean
  sppdPhotoBase64: string
}

type FormErrors = Partial<Record<keyof FormData, string>>

export default function PengajuanPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1=form, 2=ringkasan, 3=sukses
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([])
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successData, setSuccessData] = useState<{ bookingCode: string } | null>(null)
  const [geocodeQuery, setGeocodeQuery] = useState('')
  const [showGeoDropdown, setShowGeoDropdown] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [passengerInput, setPassengerInput] = useState('')

  const handleSppdPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm((f) => ({ ...f, sppdPhotoBase64: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const SCHOOL_ADDRESS = 'Jl. Arief Rahman Hakim No.35, Cigadung, Kec. Subang, Kabupaten Subang, Jawa Barat 41212'

  const [form, setForm] = useState<FormData>({
    applicantName: '',
    applicantNip: '',
    applicantJabatan: '',
    applicantUnit: '',
    applicantPhoneWa: '',
    vehicleId: '',
    purposeCategory: '',
    purposeNotes: '',
    destinationName: '',
    destinationAddress: '',
    departureDatetime: '',
    returnDatetime: '',
    additionalNotes: '',
    // Manifesting & SPPD
    driverType: 'PEMOHON',
    driverName: '',
    driverPhone: '',
    passengerCount: 1,
    passengers: [],
    passengerNotes: '',
    hasSppd: false,
    sppdPhotoBase64: '',
  })

  // Load kendaraan tersedia
  useEffect(() => {
    fetch('/api/vehicles/available')
      .then((r) => r.json())
      .then((data) => {
        setVehicles(data.vehicles || [])
        setLoadingVehicles(false)
      })
      .catch(() => setLoadingVehicles(false))
  }, [])

  // Geocode dengan debounce
  useEffect(() => {
    if (geocodeQuery.length < 3) {
      setGeocodeResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setGeocodeLoading(true)
      try {
        const res = await fetch(`/api/map/geocode?q=${encodeURIComponent(geocodeQuery)}`)
        const data = await res.json()
        setGeocodeResults(data.results || [])
        setShowGeoDropdown(true)
      } catch {
        setGeocodeResults([])
      } finally {
        setGeocodeLoading(false)
      }
    }, 600)
    return () => clearTimeout(timeout)
  }, [geocodeQuery])

  const handleGeoSelect = async (result: GeocodeResult) => {
    setForm((f) => ({
      ...f,
      destinationName: result.displayName.split(',')[0],
      destinationAddress: result.address,
      destinationLat: result.lat,
      destinationLng: result.lng,
    }))
    setGeocodeQuery(result.displayName)
    setShowGeoDropdown(false)

    // Hitung jarak dari sekolah
    try {
      const res = await fetch(
        `/api/map/route?olat=${-6.5694}&olng=${107.7588}&dlat=${result.lat}&dlng=${result.lng}`
      )
      const data = await res.json()
      if (data.distanceKm) {
        setForm((f) => ({ ...f, routeDistanceKm: data.distanceKm }))
      }
    } catch {
      // Jarak tidak wajib, lanjut tanpa error
    }
  }

  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!form.applicantName.trim() || form.applicantName.trim().length < 3)
      errs.applicantName = 'Nama lengkap minimal 3 karakter.'
    if (!form.applicantJabatan.trim())
      errs.applicantJabatan = 'Jabatan wajib diisi.'
    if (!form.applicantPhoneWa.trim())
      errs.applicantPhoneWa = 'Nomor WhatsApp wajib diisi.'
    if (!/^(\+62|62|0)[0-9]{8,13}$/.test(form.applicantPhoneWa.trim()))
      errs.applicantPhoneWa = 'Nomor WhatsApp tidak valid. Gunakan format Indonesia.'
    if (!form.vehicleId)
      errs.vehicleId = 'Pilih kendaraan yang akan digunakan.'
    if (!form.purposeCategory)
      errs.purposeCategory = 'Pilih kategori keperluan.'
    if (!form.destinationName.trim())
      errs.destinationName = 'Nama tujuan wajib diisi.'
    if (!form.destinationAddress.trim())
      errs.destinationAddress = 'Alamat tujuan wajib diisi.'
    if (!form.departureDatetime)
      errs.departureDatetime = 'Waktu berangkat wajib diisi.'
    if (!form.returnDatetime)
      errs.returnDatetime = 'Waktu kembali wajib diisi.'
    if (form.departureDatetime && new Date(form.departureDatetime) <= new Date())
      errs.departureDatetime = 'Waktu berangkat harus di masa depan.'
    if (
      form.departureDatetime &&
      form.returnDatetime &&
      new Date(form.returnDatetime) <= new Date(form.departureDatetime)
    )
      errs.returnDatetime = 'Waktu kembali harus setelah waktu berangkat.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSubmitting(true)
    setSubmitError('')

    const finalDriverName =
      form.driverType === 'PEMOHON'
        ? form.applicantName
        : form.driverName.trim() || form.applicantName
    const finalDriverPhone =
      form.driverType === 'PEMOHON'
        ? form.applicantPhoneWa
        : form.driverPhone.trim() || form.applicantPhoneWa

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          driverName: finalDriverName,
          driverPhone: finalDriverPhone,
          departureDatetime: new Date(form.departureDatetime).toISOString(),
          returnDatetime: new Date(form.returnDatetime).toISOString(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Terjadi kesalahan. Coba lagi.')
        return
      }
      setSuccessData({ bookingCode: data.bookingCode })
      setStep(3)
    } catch {
      setSubmitError('Gagal mengirim pengajuan. Periksa koneksi internet Anda.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = (field: keyof FormData) =>
    `form-input${errors[field] ? ' error' : ''}`

  // Minimal datetime untuk input (sekarang + 30 menit)
  const minDatetime = new Date(Date.now() + 30 * 60 * 1000)
    .toISOString()
    .slice(0, 16)

  if (step === 3 && successData) {
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
          </div>
        </nav>
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div className="card animate-slide-up" style={{ maxWidth: '540px', width: '100%' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>✅</div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '0.5rem' }}>
                Pengajuan Berhasil Dikirim!
              </h1>
              <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>
                Simpan kode booking Anda untuk mengecek status pengajuan.
              </p>

              <div style={{
                background: 'var(--color-primary-50)',
                border: '2px dashed var(--color-primary-300)',
                borderRadius: 'var(--radius-xl)',
                padding: '1.5rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-600)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  KODE BOOKING ANDA
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--color-navy)',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                }}>
                  {successData.bookingCode}
                </div>
              </div>

              <div className="alert alert-warning" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <span>⚠️</span>
                <div>
                  <strong>Simpan kode ini!</strong> Anda membutuhkan kode booking dan nomor WhatsApp untuk mengecek status pengajuan.
                </div>
              </div>

              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', textAlign: 'left' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '0.25rem' }}>Status</div>
                <div style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>⏳ Menunggu Persetujuan</div>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', marginBottom: '2rem' }}>
                Notifikasi WhatsApp akan dikirim ke nomor yang Anda daftarkan. Cek status kapan saja melalui tombol di bawah.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link href={`/cek-booking`} className="btn btn-primary">
                  🔍 Cek Status Booking
                </Link>
                <Link href="/" className="btn btn-secondary">
                  ← Kembali ke Beranda
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicleId)

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
          <Link href="/" className="btn btn-secondary btn-sm">← Beranda</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Form Pengajuan Peminjaman
          </h1>
          <p style={{ color: 'var(--color-gray-500)' }}>
            Lengkapi semua informasi yang diperlukan. Kolom bertanda <span style={{ color: 'var(--color-danger)' }}>*</span> wajib diisi.
          </p>
        </div>

        {/* Ringkasan sebelum submit */}
        {step === 2 ? (
          <div className="card animate-slide-up">
            <div className="card-header">
              <h3>📋 Ringkasan Pengajuan</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: '1rem' }}>
                {[
                  { label: 'Nama', value: form.applicantName },
                  { label: 'NIP', value: form.applicantNip || '-' },
                  { label: 'Jabatan', value: form.applicantJabatan },
                  { label: 'Unit/Bagian', value: form.applicantUnit || '-' },
                  { label: 'No. WhatsApp', value: form.applicantPhoneWa },
                  { label: 'Kendaraan', value: selectedVehicle ? `${selectedVehicle.name} (${selectedVehicle.plateNumber})` : '-' },
                  { label: 'Keperluan', value: `${form.purposeCategory}${form.purposeNotes ? ': ' + form.purposeNotes : ''}` },
                  { label: 'Asal Keberangkatan', value: SCHOOL_ADDRESS },
                  { label: 'Tujuan', value: form.destinationName },
                  { label: 'Alamat Tujuan', value: form.destinationAddress },
                  { label: 'Estimasi Jarak (1 arah)', value: form.routeDistanceKm ? `${form.routeDistanceKm} km` : 'Tidak tersedia' },
                  { label: 'Waktu Berangkat', value: new Date(form.departureDatetime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) },
                  { label: 'Waktu Kembali', value: new Date(form.returnDatetime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) },
                  {
                    label: 'Pengemudi / Supir',
                    value: form.driverType === 'PEMOHON'
                      ? `${form.applicantName} (Pemohon Sendiri)`
                      : `${form.driverName || '-'} ${form.driverPhone ? `(${form.driverPhone})` : ''}`,
                  },
                  {
                    label: 'Penumpang Guru / Staf',
                    value: form.passengers.length > 0 ? form.passengers.join(', ') : 'Hanya pengemudi',
                  },
                  ...(form.passengerNotes ? [{ label: 'Catatan Siswa / Peserta Lain', value: form.passengerNotes }] : []),
                  {
                    label: 'Dokumen SPPD',
                    value: form.hasSppd ? '✅ Ada Lampiran Foto SPPD' : 'Tidak Ada',
                  },
                  { label: 'Catatan', value: form.additionalNotes || '-' },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: '0.75rem' }}>
                    <div style={{ width: '160px', flexShrink: 0, color: 'var(--color-gray-500)', fontWeight: 500 }}>{row.label}</div>
                    <div style={{ flex: 1, color: 'var(--color-gray-800)', fontWeight: 500 }}>{row.value}</div>
                  </div>
                ))}
              </div>

              {form.hasSppd && form.sppdPhotoBase64 && (
                <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>📄 Lampiran Foto Dokumen SPPD:</div>
                  <img src={form.sppdPhotoBase64} alt="Foto SPPD" style={{ maxWidth: '140px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              )}

              {submitError && (
                <div className="alert alert-danger" style={{ marginTop: '1.5rem' }}>
                  <span>⚠️</span> {submitError}
                </div>
              )}

              <div className="alert alert-info" style={{ marginTop: '1.5rem' }}>
                <span>ℹ️</span>
                <div>Estimasi jarak di atas adalah estimasi rute satu arah dari peta dan <strong>bukan jarak aktual perjalanan</strong>. Jarak nyata dicatat dari odometer kendaraan.</div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  ← Edit Data
                </button>
                <button
                  className={`btn btn-primary${submitting ? ' btn-loading' : ''}`}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Mengirim...' : '✅ Kirim Pengajuan'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Data Diri */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  👤 Data Pemohon
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nama Lengkap Guru / Staf <span className="required">*</span></label>
                    <EmployeeCombobox
                      value={form.applicantName}
                      onChange={(val) => setForm((f) => ({ ...f, applicantName: val }))}
                      onSelectEmployee={(emp) => {
                        setForm((f) => ({
                          ...f,
                          applicantName: emp.name,
                          applicantNip: emp.nip || '',
                          applicantPhoneWa: emp.phoneWa || f.applicantPhoneWa,
                          applicantJabatan: emp.jabatan || emp.pangkatGol || f.applicantJabatan || 'Guru / Tendik',
                          applicantUnit: emp.unit || f.applicantUnit || 'SMK Negeri 1 Subang',
                        }))
                      }}
                      placeholder="Cari nama guru atau staf dari daftar..."
                    />
                    {errors.applicantName && <span className="form-error">⚠ {errors.applicantName}</span>}
                    <span className="form-hint">Ketik untuk mencari dari daftar guru, NIP & No. WhatsApp akan terisi otomatis.</span>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">NIP</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Jika ada"
                        value={form.applicantNip}
                        onChange={(e) => setForm((f) => ({ ...f, applicantNip: e.target.value }))}
                      />
                      <span className="form-hint">Kosongkan jika tidak memiliki NIP</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Jabatan <span className="required">*</span></label>
                      <input
                        className={inputClass('applicantJabatan')}
                        type="text"
                        placeholder="Contoh: Guru, Staff TU"
                        value={form.applicantJabatan}
                        onChange={(e) => setForm((f) => ({ ...f, applicantJabatan: e.target.value }))}
                      />
                      {errors.applicantJabatan && <span className="form-error">⚠ {errors.applicantJabatan}</span>}
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Unit/Bagian</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="Contoh: Kurikulum, Kesiswaan"
                        value={form.applicantUnit}
                        onChange={(e) => setForm((f) => ({ ...f, applicantUnit: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nomor WhatsApp <span className="required">*</span></label>
                      <input
                        className={inputClass('applicantPhoneWa')}
                        type="tel"
                        placeholder="Contoh: 08123456789"
                        value={form.applicantPhoneWa}
                        onChange={(e) => setForm((f) => ({ ...f, applicantPhoneWa: e.target.value }))}
                      />
                      {errors.applicantPhoneWa
                        ? <span className="form-error">⚠ {errors.applicantPhoneWa}</span>
                        : <span className="form-hint">Notifikasi status dikirim ke nomor ini</span>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Kendaraan */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  🚗 Kendaraan
                </h3>
                {loadingVehicles ? (
                  <div className="loading-container" style={{ padding: '1rem' }}>
                    <div className="loading-spinner" />
                    <span style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Memuat daftar kendaraan...</span>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="alert alert-warning">
                    <span>⚠️</span> Tidak ada kendaraan yang tersedia saat ini. Hubungi admin.
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Pilih Kendaraan <span className="required">*</span></label>
                    <select
                      className={`form-select${errors.vehicleId ? ' error' : ''}`}
                      value={form.vehicleId}
                      onChange={(e) => setForm((f) => ({ ...f, vehicleId: e.target.value }))}
                    >
                      <option value="">-- Pilih Kendaraan --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} — {v.brand} {v.type} ({v.plateNumber}) {v.status === 'IN_USE' ? '• Sedang Digunakan' : '• Tersedia'}
                        </option>
                      ))}
                    </select>
                    {errors.vehicleId && <span className="form-error">⚠ {errors.vehicleId}</span>}

                    {/* Kalender visual ketersediaan tanggal */}
                    {selectedVehicle && (
                      <VehicleCalendarPicker
                        vehicleId={selectedVehicle.id}
                        vehicleName={selectedVehicle.name}
                        plateNumber={selectedVehicle.plateNumber}
                        departureValue={form.departureDatetime}
                        returnValue={form.returnDatetime}
                        onSelectDateRange={(dep, ret) => {
                          setForm((f) => ({
                            ...f,
                            departureDatetime: dep.slice(0, 16),
                            returnDatetime: ret.slice(0, 16),
                          }))
                        }}
                      />
                    )}
                  </div>
                )}
              </div>

              <hr className="divider" />

              {/* Keperluan */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  📋 Keperluan Perjalanan
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Kategori Keperluan <span className="required">*</span></label>
                    <select
                      className={`form-select${errors.purposeCategory ? ' error' : ''}`}
                      value={form.purposeCategory}
                      onChange={(e) => setForm((f) => ({ ...f, purposeCategory: e.target.value }))}
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {errors.purposeCategory && <span className="form-error">⚠ {errors.purposeCategory}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Keterangan Keperluan</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Jelaskan keperluan perjalanan secara singkat..."
                      value={form.purposeNotes}
                      rows={3}
                      onChange={(e) => setForm((f) => ({ ...f, purposeNotes: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Rute */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  📍 Rute Perjalanan
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Keberangkatan</label>
                    <input
                      className="form-input"
                      type="text"
                      value={SCHOOL_ADDRESS}
                      readOnly
                      style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }}
                    />
                    <span className="form-hint">Titik keberangkatan resmi SMKN 1 Subang</span>
                  </div>

                  <div className="form-group" style={{ position: 'relative' }}>
                    <label className="form-label">Tujuan <span className="required">*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className={`form-input${errors.destinationName ? ' error' : ''}`}
                        type="text"
                        placeholder="Cari nama tempat tujuan..."
                        value={geocodeQuery}
                        onChange={(e) => {
                          setGeocodeQuery(e.target.value)
                          setForm((f) => ({
                            ...f,
                            destinationName: e.target.value,
                            destinationAddress: '',
                            destinationLat: undefined,
                            destinationLng: undefined,
                            routeDistanceKm: undefined,
                          }))
                        }}
                        onFocus={() => geocodeResults.length > 0 && setShowGeoDropdown(true)}
                        autoComplete="off"
                      />
                      {geocodeLoading && (
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                          <div className="loading-spinner" />
                        </div>
                      )}
                    </div>

                    {showGeoDropdown && geocodeResults.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1.5px solid var(--color-primary-300)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-xl)',
                        zIndex: 100,
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}>
                        {geocodeResults.map((r, i) => (
                          <button
                            key={i}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '0.75rem 1rem',
                              textAlign: 'left',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              color: 'var(--color-gray-700)',
                              borderBottom: '1px solid var(--color-gray-100)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-primary-50)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            onClick={() => handleGeoSelect(r)}
                          >
                            📍 {r.displayName}
                          </button>
                        ))}
                      </div>
                    )}
                    {errors.destinationName && <span className="form-error">⚠ {errors.destinationName}</span>}
                    <span className="form-hint">Ketik minimal 3 karakter untuk pencarian peta</span>
                  </div>

                  {form.destinationAddress && (
                    <div className="form-group">
                      <label className="form-label">Alamat Tujuan Lengkap</label>
                      <textarea
                        className="form-textarea"
                        value={form.destinationAddress}
                        onChange={(e) => setForm((f) => ({ ...f, destinationAddress: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  )}

                  {form.routeDistanceKm !== undefined && (
                    <div className="alert alert-info">
                      <span>🛣️</span>
                      <div>
                        <strong>Estimasi Jarak Satu Arah: {form.routeDistanceKm} km</strong>
                        <br />
                        <small>Ini adalah estimasi dari peta, bukan jarak aktual. Jarak nyata dicatat dari odometer kendaraan.</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <hr className="divider" />

              {/* Jadwal */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  📅 Jadwal Perjalanan
                </h3>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Tanggal & Jam Berangkat <span className="required">*</span></label>
                    <input
                      className={inputClass('departureDatetime')}
                      type="datetime-local"
                      min={minDatetime}
                      value={form.departureDatetime}
                      onChange={(e) => setForm((f) => ({ ...f, departureDatetime: e.target.value }))}
                    />
                    {errors.departureDatetime && <span className="form-error">⚠ {errors.departureDatetime}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal & Jam Kembali <span className="required">*</span></label>
                    <input
                      className={inputClass('returnDatetime')}
                      type="datetime-local"
                      min={form.departureDatetime || minDatetime}
                      value={form.returnDatetime}
                      onChange={(e) => setForm((f) => ({ ...f, returnDatetime: e.target.value }))}
                    />
                    {errors.returnDatetime && <span className="form-error">⚠ {errors.returnDatetime}</span>}
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Manifesting & Penumpang */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  👥 Manifesting Armada (Pengemudi & Penumpang)
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {/* Pilihan Supir */}
                  <div className="form-group">
                    <label className="form-label">Pengemudi / Supir Kendaraan <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="driverType"
                          checked={form.driverType === 'PEMOHON'}
                          onChange={() => setForm((f) => ({ ...f, driverType: 'PEMOHON' }))}
                        />
                        <span>Pemohon Sendiri ({form.applicantName || 'Saya'})</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="driverType"
                          checked={form.driverType === 'GURU_LAIN'}
                          onChange={() => setForm((f) => ({ ...f, driverType: 'GURU_LAIN' }))}
                        />
                        <span>Guru / Staf Lain</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="driverType"
                          checked={form.driverType === 'SUPIR_LUAR'}
                          onChange={() => setForm((f) => ({ ...f, driverType: 'SUPIR_LUAR' }))}
                        />
                        <span>Supir Sekolah / Luar</span>
                      </label>
                    </div>

                    {form.driverType === 'GURU_LAIN' && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <EmployeeCombobox
                          value={form.driverName}
                          onChange={(val) => setForm((f) => ({ ...f, driverName: val }))}
                          onSelectEmployee={(emp) => {
                            setForm((f) => ({
                              ...f,
                              driverName: emp.name,
                              driverPhone: emp.phoneWa || f.driverPhone,
                            }))
                          }}
                          placeholder="Cari nama guru yang bertugas mengemudi..."
                        />
                      </div>
                    )}

                    {form.driverType === 'SUPIR_LUAR' && (
                      <div className="grid-2" style={{ marginTop: '0.25rem' }}>
                        <div>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="Nama Supir..."
                            value={form.driverName}
                            onChange={(e) => setForm((f) => ({ ...f, driverName: e.target.value }))}
                          />
                        </div>
                        <div>
                          <input
                            className="form-input"
                            type="tel"
                            placeholder="Nomor HP/WA Supir..."
                            value={form.driverPhone}
                            onChange={(e) => setForm((f) => ({ ...f, driverPhone: e.target.value }))}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Penumpang Guru / Staf */}
                  <div className="form-group">
                    <label className="form-label">Daftar Penumpang Guru / Staf yang Ikut</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <EmployeeCombobox
                          value={passengerInput}
                          onChange={setPassengerInput}
                          onSelectEmployee={(emp) => {
                            if (!form.passengers.includes(emp.name)) {
                              setForm((f) => ({
                                ...f,
                                passengers: [...f.passengers, emp.name],
                                passengerCount: f.passengers.length + 2,
                              }))
                            }
                            setPassengerInput('')
                          }}
                          placeholder="Ketik & pilih nama guru/staf yang ikut..."
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (passengerInput.trim() && !form.passengers.includes(passengerInput.trim())) {
                            setForm((f) => ({
                              ...f,
                              passengers: [...f.passengers, passengerInput.trim()],
                              passengerCount: f.passengers.length + 2,
                            }))
                            setPassengerInput('')
                          }
                        }}
                      >
                        + Tambah
                      </button>
                    </div>

                    {form.passengers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {form.passengers.map((p, idx) => (
                          <span
                            key={idx}
                            className="badge status-approved"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}
                          >
                            <span>👤 {p}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((f) => ({
                                  ...f,
                                  passengers: f.passengers.filter((_, i) => i !== idx),
                                  passengerCount: Math.max(1, f.passengers.length),
                                }))
                              }}
                              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', padding: 0 }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Catatan Siswa / Tamu */}
                  <div className="form-group">
                    <label className="form-label">Catatan Penumpang Siswa / Peserta Lainnya</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Contoh: Diikuti 4 siswa kontingen LKS (Ahmad, Budi, Siti, Rian)..."
                      value={form.passengerNotes}
                      rows={2}
                      onChange={(e) => setForm((f) => ({ ...f, passengerNotes: e.target.value }))}
                    />
                    <span className="form-hint">Cantumkan bila ada siswa atau pihak pendamping luar sekolah yang turut serta di armada.</span>
                  </div>
                </div>
              </div>

              <hr className="divider" />

              {/* Dokumen SPPD */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-primary-100)' }}>
                  📄 Surat Perintah Perjalanan Dinas (SPPD)
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Apakah perjalanan dinas ini memiliki dokumen SPPD / Surat Tugas?</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="hasSppd"
                          checked={form.hasSppd}
                          onChange={() => setForm((f) => ({ ...f, hasSppd: true }))}
                        />
                        <span style={{ fontWeight: 600, color: '#0d9488' }}>Ya, ada dokumen SPPD</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="hasSppd"
                          checked={!form.hasSppd}
                          onChange={() => setForm((f) => ({ ...f, hasSppd: false, sppdPhotoBase64: '' }))}
                        />
                        <span>Tidak Ada</span>
                      </label>
                    </div>
                  </div>

                  {form.hasSppd && (
                    <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed #cbd5e1' }}>
                      <label className="form-label">Unggah Foto Dokumen SPPD / Surat Tugas</label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleSppdPhotoUpload}
                        className="form-input"
                        style={{ background: '#fff' }}
                      />
                      <span className="form-hint">Ambil foto dokumen langsung dari kamera HP atau pilih file dari galeri.</span>

                      {form.sppdPhotoBase64 && (
                        <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
                          <img
                            src={form.sppdPhotoBase64}
                            alt="Preview SPPD"
                            style={{ width: '120px', height: '160px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid #cbd5e1' }}
                          />
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, sppdPhotoBase64: '' }))}
                            style={{
                              position: 'absolute',
                              top: '-6px',
                              right: '-6px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '22px',
                              height: '22px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <hr className="divider" />

              {/* Catatan */}
              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <textarea
                  className="form-textarea"
                  placeholder="Informasi lain yang perlu diketahui admin (opsional)..."
                  value={form.additionalNotes}
                  rows={3}
                  onChange={(e) => setForm((f) => ({ ...f, additionalNotes: e.target.value }))}
                />
              </div>

              {Object.keys(errors).length > 0 && (
                <div className="alert alert-danger">
                  <span>⚠️</span>
                  <div>Terdapat beberapa isian yang belum lengkap. Periksa kembali formulir di atas.</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => { if (validate()) setStep(2) }}
                >
                  Tinjau Pengajuan →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
