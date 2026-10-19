'use client'
// app/admin/akun/page.tsx — Manajemen Akun Admin/Approver (Tambah, Edit, Hapus, Aktif/Nonaktif)

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

type CurrentUser = {
  id?: string
  email?: string
  role?: string
}

const ROLE_LABELS: Record<string, { label: string; badgeCls: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', badgeCls: 'status-approved' },
  ADMIN: { label: 'Administrator', badgeCls: 'status-ready' },
  APPROVER: { label: 'Pejabat Penyetuju', badgeCls: 'status-active' },
  DRIVER: { label: 'Pengemudi', badgeCls: 'status-inspection' },
}

export default function AkunPage() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const emptyForm = {
    name: '',
    email: '',
    role: 'ADMIN',
    phoneWa: '',
    password: '',
    isActive: true,
  }
  const [form, setForm] = useState(emptyForm)

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
      if (data.currentUser) {
        setCurrentUser(data.currentUser)
      }
    } catch {
      setError('Gagal memuat data akun.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  const openEdit = (u: User) => {
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      phoneWa: u.phoneWa || '',
      password: '', // optional on edit
      isActive: u.isActive,
    })
    setEditingId(u.id)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.')
      return
    }

    if (!editingId && (!form.password || form.password.length < 8)) {
      setError('Password wajib diisi minimal 8 karakter untuk akun baru.')
      return
    }

    if (editingId && form.password && form.password.length < 8) {
      setError('Password baru minimal 8 karakter jika ingin diubah.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const url = editingId ? `/api/admin/users/${editingId}` : '/api/admin/users'
      const method = editingId ? 'PATCH' : 'POST'

      const payload: Record<string, any> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        phoneWa: form.phoneWa?.trim() || null,
        isActive: form.isActive,
      }

      if (form.password) {
        payload.password = form.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan data akun.')
        return
      }

      setMessage(editingId ? 'Akun berhasil diperbarui.' : 'Akun baru berhasil dibuat.')
      setShowForm(false)
      setForm(emptyForm)
      setEditingId(null)
      loadUsers()
    } catch {
      setError('Gagal menyimpan. Periksa koneksi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    if (user.id === 'system' || user.email === 'system@sipko.local') {
      alert('Akun sistem tidak dapat dihapus.')
      return
    }
    if (currentUser?.id === user.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.')
      return
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus akun "${user.name}" (${user.email})?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menghapus akun.')
        return
      }
      setMessage(`Akun "${user.name}" berhasil dihapus.`)
      loadUsers()
    } catch {
      setError('Gagal menghapus. Periksa koneksi.')
    }
  }

  const toggleActive = async (id: string, currentActive: boolean) => {
    if (id === currentUser?.id && currentActive) {
      alert('Anda tidak dapat menonaktifkan akun Anda sendiri.')
      return
    }
    if (!confirm(`${currentActive ? 'Nonaktifkan' : 'Aktifkan'} akun ini?`)) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mengubah status.')
        return
      }
      setMessage(`Status akun berhasil ${currentActive ? 'dinonaktifkan' : 'diaktifkan'}.`)
      loadUsers()
    } catch {
      setError('Gagal. Periksa koneksi.')
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.phoneWa && u.phoneWa.includes(search))
    const matchRole = !filterRole || u.role === filterRole
    return matchSearch && matchRole
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Manajemen Akun</h1>
          <p className="page-subtitle">Kelola akun admin, pejabat penyetuju, dan pengemudi SIPKO.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          ➕ Tambah Akun
        </button>
      </div>

      {message && (
        <div className="alert alert-success animate-slide-up" style={{ marginBottom: 'var(--space-4)' }}>
          <span>✅</span> {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger animate-slide-up" style={{ marginBottom: 'var(--space-4)' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Form Tambah / Edit Akun */}
      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-6)', border: '2px solid var(--color-primary-200)' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>
              {editingId ? '✏️ Edit Akun Pengguna' : '➕ Buat Akun Baru'}
            </h3>
            <button className="btn-icon" onClick={() => setShowForm(false)} title="Tutup">
              ✕
            </button>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Nama Lengkap <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="Contoh: Budi Santoso"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Email <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="nama@smkn1subang.sch.id"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Role Pengguna <span className="required">*</span></label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  disabled={editingId ? users.find((u) => u.id === editingId)?.email === 'system@sipko.local' : false}
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="APPROVER">Pejabat Penyetuju (Kepala Sekolah/Wakasek)</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="DRIVER">Pengemudi / Driver</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">No. WhatsApp (Notifikasi)</label>
                <input
                  className="form-input"
                  type="tel"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={form.phoneWa}
                  onChange={(e) => setForm((f) => ({ ...f, phoneWa: e.target.value }))}
                />
                <span className="form-hint">Digunakan untuk pengiriman notifikasi otomatis via WhatsApp</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  {editingId ? 'Password Baru (Opsional)' : 'Password'} <span className="required">{!editingId && '*'}</span>
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder={editingId ? 'Kosongkan jika tidak ingin mengubah password' : 'Minimal 8 karakter'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                {editingId && (
                  <span className="form-hint">Biarkan kosong bila tidak ingin mengganti password akun</span>
                )}
              </div>

              {editingId && (
                <div className="form-group">
                  <label className="form-label">Status Akun</label>
                  <select
                    className="form-select"
                    value={form.isActive ? 'true' : 'false'}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
                    disabled={users.find((u) => u.id === editingId)?.email === 'system@sipko.local' || currentUser?.id === editingId}
                  >
                    <option value="true">✅ Aktif</option>
                    <option value="false">🔒 Non-Aktif</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Batal
              </button>
              <button
                className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Menyimpan...' : editingId ? '💾 Simpan Perubahan' : '➕ Buat Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="card-body" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Cari nama, email, atau no. WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: '0.875rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select
              className="form-select"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{ fontSize: '0.875rem', width: 'auto' }}
            >
              <option value="">Semua Role</option>
              <option value="ADMIN">Administrator</option>
              <option value="APPROVER">Pejabat Penyetuju</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="DRIVER">Pengemudi</option>
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
              Total: <strong>{filteredUsers.length}</strong> akun
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Memuat data akun...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">Tidak ada akun yang sesuai</div>
              <p>Coba sesuaikan kata kunci pencarian atau filter role.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>NAMA</th>
                <th>EMAIL</th>
                <th>ROLE</th>
                <th>WHATSAPP</th>
                <th>STATUS</th>
                <th style={{ minWidth: '220px' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSystem = u.id === 'system' || u.email === 'system@sipko.local'
                const isSelf = currentUser?.id === u.id
                const roleInfo = ROLE_LABELS[u.role] || { label: u.role, badgeCls: 'status-approved' }

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      {isSelf && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-primary-600)', fontWeight: 500 }}>
                          (Akun Anda)
                        </span>
                      )}
                      {isSystem && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-500)' }}>
                          (Sistem Internal)
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}>
                      {u.email}
                    </td>
                    <td>
                      <span className={`badge ${roleInfo.badgeCls}`} style={{ fontSize: '0.72rem' }}>
                        ● {roleInfo.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-sm)' }}>
                      {u.phoneWa || <span style={{ color: 'var(--color-gray-400)' }}>-</span>}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'status-done' : 'status-cancelled'}`}>
                        ● {u.isActive ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Tombol Edit */}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(u)}
                          title="Edit Akun"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                        >
                          ✏️ Edit
                        </button>

                        {/* Tombol Toggle Aktif/Nonaktif */}
                        {!isSystem && (
                          <button
                            className={`btn btn-sm ${u.isActive ? 'btn-warning' : 'btn-primary'}`}
                            onClick={() => toggleActive(u.id, u.isActive)}
                            disabled={isSelf && u.isActive}
                            title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                          >
                            {u.isActive ? '🔒 Nonaktifkan' : '✅ Aktifkan'}
                          </button>
                        )}

                        {/* Tombol Hapus */}
                        {!isSystem && !isSelf ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(u)}
                            title="Hapus Akun"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                          >
                            🗑️ Hapus
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', fontStyle: 'italic', paddingLeft: '0.25rem' }}>
                            {isSystem ? '🔒 Sistem' : '🔒 Akun Aktif'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
