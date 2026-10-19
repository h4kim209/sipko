'use client'
// app/admin/whatsapp/page.tsx — Halaman scan QR & status WhatsApp SIPKO (Mendukung QR Code & Pairing Code 8-Digit)

import { useState, useEffect, useCallback } from 'react'

const STATUS_INFO: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  CONNECTED: {
    label: 'Terhubung',
    color: 'var(--color-success)',
    icon: '✅',
    desc: 'WhatsApp aktif dan siap mengirim notifikasi peminjaman secara otomatis.',
  },
  QR_PENDING: {
    label: 'Menunggu Penautan',
    color: 'var(--color-warning)',
    icon: '📱',
    desc: 'Scan QR Code atau gunakan Kode Pairing 8 digit di bawah menggunakan WhatsApp HP Anda.',
  },
  CONNECTING: {
    label: 'Menghubungkan...',
    color: 'var(--color-primary-500)',
    icon: '🔄',
    desc: 'Sedang menginisialisasi gateway WhatsApp. Tunggu sebentar...',
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

  // Metode Penautan: 'qr' atau 'pairing'
  const [pairMode, setPairMode] = useState<'qr' | 'pairing'>('qr')
  const [pairPhone, setPairPhone] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [pairingLoading, setPairingLoading] = useState(false)

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
    setPairingCode(null)
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
        setSuccessMsg('Sesi lama berhasil dibersihkan! Silakan tautkan perangkat kembali.')
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memulai koneksi WhatsApp.')
    } finally {
      setActionLoading(false)
      setActionType(null)
    }
  }

  const handleRequestPairingCode = async () => {
    if (!pairPhone.trim()) {
      alert('Masukkan nomor WhatsApp yang akan digunakan sebagai pengirim notifikasi.')
      return
    }
    setPairingLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch('/api/whatsapp/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pairing_code', phone: pairPhone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mendapatkan kode pairing.')
      setPairingCode(data.pairingCode)
      setSuccessMsg('Kode pairing berhasil didapatkan! Masukkan kode ini di WhatsApp ponsel Anda.')
    } catch (err: any) {
      setError(err.message || 'Gagal meminta kode pairing.')
    } finally {
      setPairingLoading(false)
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
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
                      style={{ flex: 1, minWidth: '160px' }}
                    >
                      {actionLoading && actionType === 'reconnect' ? 'Menghubungkan...' : '🚀 Hubungkan Ulang'}
                    </button>

                    <button
                      className={`btn btn-danger btn-sm${actionLoading && actionType === 'reset' ? ' btn-loading' : ''}`}
                      onClick={() => {
                        if (confirm('Apakah Anda ingin mereset sesi WhatsApp dan menghapus data pairing lama? Anda harus scan QR / input kode baru.')) {
                          handleReconnect(true)
                        }
                      }}
                      disabled={actionLoading}
                      title="Gunakan ini jika WhatsApp macet atau ingin ganti nomor pengirim"
                      style={{ minWidth: '150px' }}
                    >
                      {actionLoading && actionType === 'reset' ? 'Mereset...' : '🗑️ Reset Sesi Bersih'}
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

          {/* Petunjuk Penggunaan */}
          <div className="card">
            <div className="card-header">
              <h3>📖 Solusi Mengatasi Masalah Koneksi</h3>
            </div>
            <div className="card-body" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 var(--space-2) 0' }}>
                Jika pada saat Scan QR muncul notifikasi <em>&quot;tidak bisa login, cek koneksi internet&quot;</em> di WhatsApp HP Anda:
              </p>
              <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <li>Gunakan <strong>Metode 2: Kode Pairing 8 Digit</strong> di sebelah kanan (sangat direkomendasikan dan bebas dari kendala timeout kamera).</li>
                <li>Atau klik tombol merah <strong>&quot;🗑️ Reset Sesi Bersih&quot;</strong> di atas, tunggu QR baru muncul, lalu coba scan kembali.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Tautan Perangkat (QR Code atau Pairing Code) */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-6)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>🔗 Tautkan Perangkat</h3>
            {status !== 'CONNECTED' && (
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-gray-100)', padding: '2px', borderRadius: 'var(--radius-md)' }}>
                <button
                  className={`btn btn-sm ${pairMode === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setPairMode('qr')}
                >
                  📷 Scan QR
                </button>
                <button
                  className={`btn btn-sm ${pairMode === 'pairing' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setPairMode('pairing')}
                >
                  🔢 Kode 8-Digit
                </button>
              </div>
            )}
          </div>

          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-10)', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                Memuat data penautan...
              </div>
            ) : status === 'CONNECTED' ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '4.5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>
                  WhatsApp Berhasil Terhubung!
                </div>
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                  Semua notifikasi pengajuan peminjaman kendaraan akan dikirimkan otomatis melalui nomor ini.
                </p>
                {phoneConnected && (
                  <div style={{ marginTop: '1rem', display: 'inline-block', background: 'var(--color-gray-100)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-lg)', fontFamily: 'monospace', fontWeight: 600 }}>
                    +{phoneConnected}
                  </div>
                )}
              </div>
            ) : pairMode === 'pairing' ? (
              /* Tampilan Metode 2: Pairing Code 8-Digit */
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-800)' }}>
                  🔢 Tautkan Menggunakan Kode Pairing (Anti-Gagal)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', margin: 0 }}>
                  Masukkan nomor WhatsApp yang ada di HP Anda. Kode 8-digit akan ditampilkan untuk dimasukkan langsung ke aplikasi WhatsApp di ponsel.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'var(--space-2)' }}>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Contoh: 088706320887"
                    value={pairPhone}
                    onChange={(e) => setPairPhone(e.target.value)}
                    style={{ flex: 1 }}
                    disabled={pairingLoading}
                  />
                  <button
                    className={`btn btn-primary btn-sm${pairingLoading ? ' btn-loading' : ''}`}
                    onClick={handleRequestPairingCode}
                    disabled={pairingLoading}
                  >
                    {pairingLoading ? 'Meminta...' : 'Dapatkan Kode'}
                  </button>
                </div>

                {pairingCode && (
                  <div
                    className="animate-slide-up"
                    style={{
                      marginTop: 'var(--space-3)',
                      padding: 'var(--space-4)',
                      background: 'var(--color-primary-50, #eff6ff)',
                      border: '2px dashed var(--color-primary-500)',
                      borderRadius: 'var(--radius-xl)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary-700)', fontWeight: 600, marginBottom: '6px' }}>
                      KODE PAIRING WHATSAPP ANDA:
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '2rem',
                        fontWeight: 800,
                        letterSpacing: '0.15em',
                        color: 'var(--color-primary-800)',
                        padding: '4px',
                      }}
                    >
                      {pairingCode}
                    </div>
                    <div style={{ marginTop: 'var(--space-3)', textAlign: 'left', fontSize: '0.775rem', color: 'var(--color-gray-600)', lineHeight: 1.5 }}>
                      <strong>Cara memasukkan di HP:</strong>
                      <ol style={{ paddingLeft: '1.25rem', marginTop: '4px', marginBottom: 0 }}>
                        <li>Buka WhatsApp di HP → <strong>Perangkat Tertaut</strong></li>
                        <li>Klik <strong>Tautkan Perangkat</strong></li>
                        <li>Di bawah area pemindai QR, klik <strong>&quot;Tautkan dengan nomor telepon saja&quot;</strong></li>
                        <li>Ketik kode 8 digit di atas: <strong>{pairingCode}</strong></li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>
            ) : status === 'QR_PENDING' && qr ? (
              /* Tampilan Metode 1: QR Code */
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
                  Jika scan QR di HP Anda lambat atau muncul <em>cek koneksi</em>, beralihlah ke tab <strong>&quot;🔢 Kode 8-Digit&quot;</strong> di atas.
                </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-4)' }}>
                  {status === 'CONNECTING' ? '⏳' : '⚠️'}
                </div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', marginBottom: 'var(--space-2)' }}>
                  {status === 'CONNECTING' ? 'Sedang Mempersiapkan Sesi...' : 'Belum Ada Penautan Aktif'}
                </div>
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                  {status === 'CONNECTING'
                    ? 'Sistem sedang menghubungi gateway WhatsApp. Tunggu beberapa detik...'
                    : 'Klik tombol di bawah untuk membuat sesi baru.'}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleReconnect(false)}
                    disabled={actionLoading}
                  >
                    🚀 Mulai Penautan
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
