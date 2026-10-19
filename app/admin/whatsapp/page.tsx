'use client'
// app/admin/whatsapp/page.tsx — Halaman scan QR & status WhatsApp SIPKO

import { useState, useEffect, useCallback } from 'react'

const STATUS_INFO: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  CONNECTED: {
    label: 'Terhubung',
    color: 'var(--color-success)',
    icon: '✅',
    desc: 'WhatsApp aktif dan siap mengirim notifikasi peminjaman secara otomatis.',
  },
  QR_PENDING: {
    label: 'Menunggu Scan QR',
    color: 'var(--color-warning)',
    icon: '📱',
    desc: 'Scan QR Code di bawah menggunakan aplikasi WhatsApp di HP Anda.',
  },
  CONNECTING: {
    label: 'Menghubungkan...',
    color: 'var(--color-primary-500)',
    icon: '🔄',
    desc: 'Sedang menginisialisasi socket WhatsApp. Tunggu sebentar...',
  },
  DISCONNECTED: {
    label: 'Terputus',
    color: 'var(--color-danger)',
    icon: '❌',
    desc: 'WhatsApp tidak terhubung atau sesi sebelumnya telah terputus.',
  },
  DEV_MODE: {
    label: 'Mode Development',
    color: 'var(--color-gray-400)',
    icon: '🧪',
    desc: 'WhatsApp dalam mode simulasi dev (pesan hanya dicetak di log terminal).',
  },
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>('CONNECTING')
  const [qr, setQr] = useState<string | null>(null)
  const [phoneConnected, setPhoneConnected] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionType, setActionType] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form Uji Coba Kirim Pesan
  const [testPhone, setTestPhone] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/qr', { cache: 'no-store' })
      if (res.status === 401) {
        setError('Hanya Administrator / Super Admin yang dapat mengakses halaman ini.')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Gagal memuat status WhatsApp.')
      const data = await res.json()
      setStatus(data.status)
      setQr(data.qr || null)
      setPhoneConnected(data.phoneConnected || null)
      setLastError(data.lastError || null)
      setCountdown(data.status === 'QR_PENDING' || data.status === 'CONNECTING' ? 4 : 15)
    } catch (err: any) {
      setError(err.message || 'Gagal memeriksa status koneksi WhatsApp.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReconnect = async (resetSession = false) => {
    setActionLoading(true)
    setActionType(resetSession ? 'reset' : 'reconnect')
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: resetSession }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menghubungkan WhatsApp.')
      setStatus(data.status)
      setQr(data.qr || null)
      setPhoneConnected(data.phoneConnected || null)
      setCountdown(4)
      if (resetSession) {
        setSuccessMsg('Sesi lama berhasil dibersihkan! QR Code baru siap dipindai.')
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memulai koneksi WhatsApp.')
    } finally {
      setActionLoading(false)
      setActionType(null)
    }
  }

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      alert('Masukkan nomor WhatsApp tujuan terlebih dahulu.')
      return
    }
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || 'Gagal mengirim pesan uji coba.' })
      } else {
        setTestResult({ success: true, message: data.message || 'Pesan uji coba berhasil terkirim!' })
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Terjadi kesalahan jaringan.' })
    } finally {
      setTestLoading(false)
    }
  }

  // Auto-polling status: 4s jika QR_PENDING/CONNECTING, 15s jika CONNECTED
  useEffect(() => {
    fetchStatus()
    const intervalTime = status === 'QR_PENDING' || status === 'CONNECTING' ? 4000 : 15000
    const interval = setInterval(() => {
      fetchStatus()
    }, intervalTime)
    return () => clearInterval(interval)
  }, [fetchStatus, status])

  // Countdown display
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const info = STATUS_INFO[status] || STATUS_INFO.DISCONNECTED

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📱 WhatsApp Setup & Notifikasi</h1>
          <p className="page-subtitle">
            Kelola koneksi WhatsApp Gateway untuk mengirim notifikasi pengajuan otomatis ke pemohon dan pengelola.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success animate-slide-up" style={{ marginBottom: 'var(--space-4)' }}>
          <span>✅</span> {successMsg}
        </div>
      )}
      {error && (
        <div className="alert alert-danger animate-slide-up" style={{ marginBottom: 'var(--space-4)' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Kolom Kiri: Status & Kontrol */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Card Status Koneksi */}
          <div className="card">
            <div className="card-header">
              <h3>📶 Status Koneksi</h3>
            </div>
            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-gray-400)' }}>
                  Memeriksa status WhatsApp...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      padding: 'var(--space-4)',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-xl)',
                      border: `2px solid ${info.color}`,
                    }}
                  >
                    <div style={{ fontSize: '2.5rem' }}>{info.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: info.color }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', marginTop: '2px' }}>
                        {info.desc}
                      </div>
                      {phoneConnected && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.825rem', color: 'var(--color-gray-700)' }}>
                          📞 Nomor HP Terhubung: <strong style={{ fontFamily: 'monospace' }}>+{phoneConnected}</strong>
                        </div>
                      )}
                      {lastError && status === 'DISCONNECTED' && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-danger)', fontStyle: 'italic' }}>
                          Catatan: {lastError}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tombol-tombol Aksi */}
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-primary btn-sm${actionLoading && actionType === 'reconnect' ? ' btn-loading' : ''}`}
                      onClick={() => handleReconnect(false)}
                      disabled={actionLoading}
                      style={{ flex: 1, minWidth: '170px' }}
                    >
                      {actionLoading && actionType === 'reconnect' ? 'Menghubungkan...' : '🚀 Hubungkan / Scan QR'}
                    </button>

                    <button
                      className={`btn btn-danger btn-sm${actionLoading && actionType === 'reset' ? ' btn-loading' : ''}`}
                      onClick={() => {
                        if (confirm('Apakah Anda ingin mereset sesi WhatsApp dan menghapus data pairing lama? Anda harus scan QR code baru.')) {
                          handleReconnect(true)
                        }
                      }}
                      disabled={actionLoading}
                      title="Gunakan ini jika WhatsApp macet, terputus dari HP, atau QR code tidak muncul"
                      style={{ minWidth: '150px' }}
                    >
                      {actionLoading && actionType === 'reset' ? 'Mereset...' : '🗑️ Reset Sesi & QR Baru'}
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={fetchStatus}
                      disabled={actionLoading}
                    >
                      🔄 Refresh
                    </button>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-gray-500)',
                        background: 'var(--color-gray-100)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      Auto: {countdown}s
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Uji Coba Kirim Pesan */}
          <div className="card">
            <div className="card-header">
              <h3>🧪 Uji Coba Pengiriman Pesan WhatsApp</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', margin: 0 }}>
                Ketik nomor WhatsApp Anda untuk menguji apakah pesan notifikasi dapat diterima langsung di HP Anda.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="Contoh: 088706320887 atau 62887..."
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  style={{ flex: 1, minWidth: '200px' }}
                  disabled={status !== 'CONNECTED' || testLoading}
                />
                <button
                  className={`btn btn-primary btn-sm${testLoading ? ' btn-loading' : ''}`}
                  onClick={handleSendTest}
                  disabled={status !== 'CONNECTED' || testLoading}
                >
                  {testLoading ? 'Mengirim...' : '✉️ Kirim Pesan Tes'}
                </button>
              </div>

              {status !== 'CONNECTED' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>
                  ⚠️ Pengujian hanya dapat dilakukan setelah status WhatsApp <strong>Terhubung</strong>.
                </span>
              )}

              {testResult && (
                <div
                  className={`alert ${testResult.success ? 'alert-success' : 'alert-danger'} animate-slide-up`}
                  style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem' }}
                >
                  <span>{testResult.success ? '✅' : '❌'}</span>
                  <span style={{ fontSize: '0.825rem' }}>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Panduan Singkat */}
          <div className="card">
            <div className="card-header">
              <h3>📖 Petunjuk Tautkan Perangkat</h3>
            </div>
            <div className="card-body">
              <ol style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6, margin: 0 }}>
                <li>Buka aplikasi <strong>WhatsApp</strong> di HP Anda</li>
                <li>Buka menu titik tiga (Android) atau <strong>Pengaturan</strong> (iPhone)</li>
                <li>Pilih <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong></li>
                <li>Arahkan kamera HP ke <strong>QR Code</strong> di sebelah kanan</li>
                <li>Tunggu 2-3 detik hingga status otomatis berganti menjadi <strong style={{ color: 'var(--color-success)' }}>✅ Terhubung</strong></li>
                <li>Jika QR tidak muncul atau koneksi lama macet, klik tombol merah <strong>"🗑️ Reset Sesi & QR Baru"</strong></li>
              </ol>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Tampilan QR Code */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-6)' }}>
          <div className="card-header" style={{ textAlign: 'center' }}>
            <h3 style={{ margin: 0 }}>📷 QR Code WhatsApp</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-10)', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                Memuat QR Code...
              </div>
            ) : status === 'CONNECTED' ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '4.5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>
                  WhatsApp Berhasil Terhubung!
                </div>
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  Semua notifikasi pengajuan, persetujuan, dan pengembalian kendaraan akan dikirimkan otomatis melalui nomor ini.
                </p>
                {phoneConnected && (
                  <div style={{ marginTop: '1rem', display: 'inline-block', background: 'var(--color-gray-100)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-lg)', fontFamily: 'monospace', fontWeight: 600 }}>
                    +{phoneConnected}
                  </div>
                )}
              </div>
            ) : status === 'QR_PENDING' && qr ? (
              <div>
                <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>
                  📱 Arahkan kamera WhatsApp HP Anda ke QR di bawah:
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '16px',
                    background: 'white',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                    border: '3px solid var(--color-warning)',
                  }}
                >
                  <img
                    src={qr}
                    alt="WhatsApp QR Code"
                    style={{ display: 'block', width: '280px', height: '280px' }}
                  />
                </div>
                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-500)' }}>
                  QR Code otomatis diperbarui secara berkala.
                </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>
                  {status === 'CONNECTING' ? '⏳' : '⚠️'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-2)' }}>
                  {status === 'CONNECTING' ? 'Sedang Mempersiapkan QR Code...' : 'Belum Ada QR Code Aktif'}
                </div>
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                  {status === 'CONNECTING'
                    ? 'Sistem sedang menghubungi gateway WhatsApp. QR Code akan muncul dalam beberapa detik.'
                    : 'Klik tombol di bawah untuk membuat QR Code baru dan mulai menautkan WhatsApp.'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleReconnect(false)}
                    disabled={actionLoading}
                  >
                    🚀 Buat QR Code
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleReconnect(true)}
                    disabled={actionLoading}
                  >
                    🗑️ Reset Sesi Bersih
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
