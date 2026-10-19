'use client'
// app/admin/whatsapp/page.tsx — Halaman scan QR WhatsApp untuk Super Admin

import { useState, useEffect, useCallback } from 'react'
import type { Metadata } from 'next'

const STATUS_INFO: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  CONNECTED: {
    label: 'Terhubung',
    color: 'var(--color-success)',
    icon: '✅',
    desc: 'WhatsApp aktif dan siap mengirim notifikasi.',
  },
  QR_PENDING: {
    label: 'Scan QR',
    color: 'var(--color-warning)',
    icon: '📱',
    desc: 'Scan QR code di bawah menggunakan WhatsApp di HP Anda.',
  },
  CONNECTING: {
    label: 'Menghubungkan...',
    color: 'var(--color-primary-500)',
    icon: '🔄',
    desc: 'Sedang mencoba terhubung ke WhatsApp. Tunggu sebentar.',
  },
  DISCONNECTED: {
    label: 'Terputus',
    color: 'var(--color-danger)',
    icon: '❌',
    desc: 'WhatsApp tidak terhubung. Pastikan WA_SESSION_DIR sudah diset.',
  },
  DEV_MODE: {
    label: 'Mode Development',
    color: 'var(--color-gray-400)',
    icon: '🧪',
    desc: 'WhatsApp dalam mode dev — pesan hanya tercetak di konsol server.',
  },
}

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>('CONNECTING')
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    try {
      setError('')
      const res = await fetch('/api/whatsapp/qr', { cache: 'no-store' })
      if (res.status === 401) {
        setError('Hanya Administrator yang dapat mengakses halaman ini.')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Gagal memuat status')
      const data = await res.json()
      setStatus(data.status)
      setQr(data.qr || null)
      setCountdown(data.status === 'QR_PENDING' || data.status === 'CONNECTING' ? 5 : 20)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat status WhatsApp.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReconnect = async () => {
    setActionLoading(true)
    setError('')
    try {
      const res = await fetch('/api/whatsapp/qr', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memulai koneksi WhatsApp')
      setStatus(data.status)
      setQr(data.qr || null)
      setCountdown(5)
    } catch (err: any) {
      setError(err.message || 'Gagal menginisialisasi WhatsApp.')
    } finally {
      setActionLoading(false)
    }
  }

  // Auto-refresh setiap 5 detik saat CONNECTING / QR_PENDING, atau 20 detik saat status lain
  useEffect(() => {
    fetchStatus()
    const intervalTime = status === 'QR_PENDING' || status === 'CONNECTING' ? 5000 : 20000
    const interval = setInterval(() => {
      fetchStatus()
    }, intervalTime)
    return () => clearInterval(interval)
  }, [fetchStatus, status])

  // Countdown timer
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
          <h1 className="page-title">📱 WhatsApp Setup</h1>
          <p className="page-subtitle">Hubungkan WhatsApp untuk mengirim notifikasi otomatis ke pemohon dan admin.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-6)' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Status Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Status */}
          <div className="card">
            <div className="card-header"><h3>📶 Status Koneksi</h3></div>
            <div className="card-body">
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-gray-400)' }}>
                  Memuat status...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'var(--color-gray-50)',
                    borderRadius: 'var(--radius-xl)',
                    border: `2px solid ${info.color}`,
                  }}>
                    <div style={{ fontSize: '2.5rem' }}>{info.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: info.color }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginTop: '2px' }}>
                        {info.desc}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-primary btn-sm${actionLoading ? ' btn-loading' : ''}`}
                      onClick={handleReconnect}
                      disabled={actionLoading}
                      style={{ flex: 1, minWidth: '160px' }}
                    >
                      {actionLoading ? 'Menghubungkan...' : '🚀 Hubungkan / Buat QR Baru'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={fetchStatus}
                      disabled={actionLoading}
                    >
                      🔄 Refresh
                    </button>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-gray-400)',
                      background: 'var(--color-gray-100)',
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                    }}>
                      Auto: {countdown}s
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panduan */}
          <div className="card">
            <div className="card-header"><h3>📖 Cara Scan QR</h3></div>
            <div className="card-body">
              <ol style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', lineHeight: 1.6 }}>
                <li>Pastikan <code style={{ background: 'var(--color-gray-100)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>WA_SESSION_DIR</code> sudah diset di file <code style={{ background: 'var(--color-gray-100)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>.env.local</code></li>
                <li>Buka <strong>WhatsApp</strong> di HP yang akan digunakan sebagai pengirim notifikasi</li>
                <li>Masuk ke <strong>Pengaturan → Perangkat Tertaut → Tautkan Perangkat</strong></li>
                <li>Arahkan kamera ke QR Code yang muncul di sebelah kanan</li>
                <li>Tunggu hingga status berubah menjadi <strong style={{ color: 'var(--color-success)' }}>✅ Terhubung</strong></li>
                <li>Sesi akan tersimpan otomatis — tidak perlu scan ulang setiap restart</li>
              </ol>

              <div className="alert" style={{ marginTop: 'var(--space-4)', background: 'var(--color-warning-50, #fffbeb)', borderColor: 'var(--color-warning)', borderWidth: '1px', borderStyle: 'solid', borderRadius: 'var(--radius-lg)' }}>
                <span>⚠️</span>
                <div style={{ fontSize: 'var(--font-size-xs)' }}>
                  <strong>Penting:</strong> Gunakan nomor WhatsApp yang <strong>khusus untuk notifikasi</strong>, bukan nomor pribadi. Aktivitas pengiriman pesan massal dapat berisiko pembatasan akun.
                </div>
              </div>
            </div>
          </div>

          {/* Konfigurasi */}
          <div className="card">
            <div className="card-header"><h3>⚙️ Konfigurasi Diperlukan</h3></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-sm)' }}>
                {[
                  {
                    key: 'WA_SESSION_DIR',
                    example: 'D:/sipko-wa-session',
                    desc: 'Folder penyimpanan sesi WhatsApp. Harus ada dan bisa ditulis.',
                    required: true,
                  },
                  {
                    key: 'WA_ADMIN_NUMBERS',
                    example: '628123456789,628987654321',
                    desc: 'Nomor HP admin yang menerima notifikasi booking baru (pisah koma).',
                    required: false,
                  },
                ].map((cfg) => (
                  <div key={cfg.key} style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '4px' }}>
                      <code style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-700)' }}>{cfg.key}</code>
                      {cfg.required && <span className="badge status-rejection" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>Wajib</span>}
                    </div>
                    <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-xs)' }}>{cfg.desc}</div>
                    <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                      Contoh: {cfg.example}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Card */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-6)' }}>
          <div className="card-header">
            <h3>📷 QR Code WhatsApp</h3>
          </div>
          <div className="card-body" style={{ textAlign: 'center' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-10)', color: 'var(--color-gray-400)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                Memuat QR Code...
              </div>
            ) : status === 'CONNECTED' ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--color-success)', marginBottom: 'var(--space-2)' }}>
                  WhatsApp Terhubung!
                </div>
                <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                  Notifikasi WhatsApp siap dikirim secara otomatis.
                </div>
              </div>
            ) : status === 'QR_PENDING' && qr ? (
              <div>
                <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-warning)', fontWeight: 600 }}>
                  📱 Scan dengan WhatsApp di HP Anda
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '16px',
                  background: 'white',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  border: '3px solid var(--color-warning)',
                }}>
                  <img
                    src={qr}
                    alt="WhatsApp QR Code"
                    style={{ display: 'block', width: '280px', height: '280px' }}
                  />
                </div>
                <div style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                  QR Code akan diperbarui otomatis setiap 15 detik
                </div>
              </div>
            ) : status === 'DEV_MODE' ? (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🧪</div>
                <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Mode Development</div>
                <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                  WhatsApp tidak aktif. Set <code style={{ background: 'var(--color-gray-100)', padding: '1px 6px', borderRadius: '4px' }}>WA_SESSION_DIR</code> di <code style={{ background: 'var(--color-gray-100)', padding: '1px 6px', borderRadius: '4px' }}>.env.local</code> untuk mengaktifkan.
                </div>
              </div>
            ) : (
              <div style={{ padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🔄</div>
                <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                  {status === 'CONNECTING' ? 'Menghubungkan...' : 'Tidak Terhubung'}
                </div>
                <div style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
                  {status === 'CONNECTING'
                    ? 'Sedang menginisialisasi. Klik Refresh Status untuk cek.'
                    : 'Pastikan WA_SESSION_DIR sudah dikonfigurasi, lalu restart server.'}
                </div>
                <button className="btn btn-primary" onClick={fetchStatus}>
                  🔄 Cek Ulang
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
