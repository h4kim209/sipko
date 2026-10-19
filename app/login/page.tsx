'use client'
// app/login/page.tsx — Login Admin/Penyetuju

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Email dan password wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Email atau password salah.')
        return
      }
      router.push('/admin/dashboard')
    } catch {
      setError('Gagal masuk. Periksa koneksi internet Anda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link href="/" className="public-nav-logo">
            <div className="nav-logo-icon">SK</div>
            <div>
              <div className="nav-logo-title">SIPKO</div>
              <div className="nav-logo-subtitle">SMKN 1 Subang</div>
            </div>
          </Link>
          <Link href="/" className="btn btn-secondary btn-sm">← Beranda</Link>
        </div>
      </nav>

      <div style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'linear-gradient(135deg, var(--color-gray-50), var(--color-primary-50))',
      }}>
        <div className="card animate-slide-up" style={{ maxWidth: '420px', width: '100%' }}>
          <div className="card-body" style={{ padding: '2.5rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-navy-600))',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '1.5rem',
                color: 'white',
                fontWeight: 900,
              }}>
                SK
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>Masuk ke SIPKO</h1>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                Hanya untuk Admin dan Pejabat Penyetuju
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  placeholder="admin@smkn1subang.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className={`btn btn-primary btn-lg w-full${loading ? ' btn-loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'Masuk...' : '🔐 Masuk'}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
              Akun admin dibuat oleh administrator sistem.<br />
              Tidak ada pendaftaran publik.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
