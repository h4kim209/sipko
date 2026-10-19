'use client'
// app/admin/akun/page.tsx — Manajemen Akun Admin/Approver

import { useState, useEffect } from 'react'

type User = {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  phoneWa: string | null
  createdAt: string
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  APPROVER: 'Pejabat Penyetuju',
  SUPER_ADMIN: 'Super Admin',
  DRIVER: 'Pengemudi',
}

export default function AkunPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const emptyForm = { name: '', email: '', role: 'ADMIN', phoneWa: '', password: '' }
  const [form, setForm] = useState(emptyForm)

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError('Gagal memuat data akun.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Nama, email, dan password wajib diisi.')
      return
    }
    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal membuat akun.'); return }
      setMessage('Akun berhasil dibuat.')
      setShowForm(false)
      setForm(emptyForm)
      loadUsers()
    } catch {
      setError('Gagal. Periksa koneksi.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (!confirm(`${currentActive ? 'Nonaktifkan' : 'Aktifkan'} akun ini?`)) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (!res.ok) { setError('Gagal mengubah status.'); return }
      loadUsers()
    } catch {
      setError('Gagal. Periksa koneksi.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Manajemen Akun</h1>
          <p className="page-subtitle">Kelola akun admin dan pejabat penyetuju.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setError(''); setMessage('') }}>
          ➕ Tambah Akun
        </button>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}><span>✅</span> {message}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}><span>⚠️</span> {error}</div>}

      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3>➕ Buat Akun Baru</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nama Lengkap <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input className="form-input" type="email" placeholder="admin@smkn1subang.sch.id" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="ADMIN">Administrator</option>
                  <option value="APPROVER">Pejabat Penyetuju</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">No. WhatsApp</label>
                <input className="form-input" type="tel" placeholder="08123456789" value={form.phoneWa} onChange={e => setForm(f => ({ ...f, phoneWa: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input className="form-input" type="password" placeholder="Minimal 8 karakter" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={handleSave} disabled={saving}>
                {saving ? 'Membuat...' : '➕ Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><span>Memuat...</span></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>WhatsApp</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{u.email}</td>
                  <td><span className="badge status-approved" style={{ fontSize: '0.7rem' }}>{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{u.phoneWa || '-'}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'status-done' : 'status-cancelled'}`}>
                      {u.isActive ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.isActive ? 'btn-warning' : 'btn-primary'}`}
                      onClick={() => toggleActive(u.id, u.isActive)}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {u.isActive ? '🔒 Nonaktifkan' : '✅ Aktifkan'}
                    </button>
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
