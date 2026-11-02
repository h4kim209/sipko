'use client'
// app/admin/pemohon/page.tsx — Manajemen Data Guru & Pemohon SIPKO

import { useState, useEffect, useMemo } from 'react'

type Employee = {
  id: string
  name: string
  nip: string | null
  pangkatGol: string | null
  jabatan: string | null
  unit: string | null
  phoneWa: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function PemohonPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const emptyForm = {
    name: '',
    nip: '',
    pangkatGol: '',
    jabatan: '',
    unit: 'SMK Negeri 1 Subang',
    phoneWa: '',
    isActive: true,
  }
  const [form, setForm] = useState(emptyForm)

  const loadEmployees = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/employees')
      const data = await res.json()
      if (res.ok) {
        setEmployees(data.employees || [])
      } else {
        setError(data.error || 'Gagal memuat data guru/pemohon.')
      }
    } catch {
      setError('Gagal menghubungi server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.toLowerCase()
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.nip && e.nip.toLowerCase().includes(q)) ||
        (e.phoneWa && e.phoneWa.toLowerCase().includes(q)) ||
        (e.jabatan && e.jabatan.toLowerCase().includes(q)) ||
        (e.pangkatGol && e.pangkatGol.toLowerCase().includes(q))
    )
  }, [employees, search])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setMessage('')
    setShowModal(true)
  }

  const openEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      nip: emp.nip || '',
      pangkatGol: emp.pangkatGol || '',
      jabatan: emp.jabatan || '',
      unit: emp.unit || 'SMK Negeri 1 Subang',
      phoneWa: emp.phoneWa || '',
      isActive: emp.isActive,
    })
    setEditingId(emp.id)
    setError('')
    setMessage('')
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Nama lengkap wajib diisi.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const url = editingId ? `/api/admin/employees/${editingId}` : '/api/admin/employees'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyimpan data.')
        return
      }

      setMessage(editingId ? 'Data berhasil diperbarui.' : 'Guru/Pemohon baru berhasil ditambahkan.')
      setShowModal(false)
      loadEmployees()
    } catch {
      setError('Terjadi kesalahan saat menyimpan data.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Yakin ingin menghapus data "${emp.name}"?`)) return

    setDeletingId(emp.id)
    setError('')
    setMessage('')

    try {
      const res = await fetch(`/api/admin/employees/${emp.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menghapus data.')
        return
      }
      setMessage(`Data "${emp.name}" berhasil dihapus.`)
      loadEmployees()
    } catch {
      setError('Gagal menghubungi server saat menghapus.')
    } finally {
      setDeletingId(null)
    }
  }

  // Statistik ringkas
  const totalCount = employees.length
  const activeCount = employees.filter((e) => e.isActive).length
  const withNipCount = employees.filter((e) => e.nip && e.nip.trim() !== '').length
  const withWaCount = employees.filter((e) => e.phoneWa && e.phoneWa.trim() !== '').length

  return (
    <div>
      {/* Header Halaman */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍🏫 Data Guru & Pemohon</h1>
          <p className="page-subtitle">
            Kelola master data guru & tendik SMKN 1 Subang untuk pencarian dan autofill pada form pengajuan peminjaman.
          </p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={openAdd}>
            + Tambah Guru / Tendik
          </button>
        </div>
      </div>

      {/* Pesan Notifikasi */}
      {message && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>
          <span>✅</span> {message}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Ringkasan Statistik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid var(--color-primary-600)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>TOTAL GURU & TENDIK</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{totalCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>STATUS AKTIF</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{activeCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>TERDAFTAR NIP</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{withNipCount}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>DILENGKAPI NO. WA</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>{withWaCount}</div>
        </div>
      </div>

      {/* Filter & Kontrol Pencarian */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-body" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Cari nama guru, NIP, no. WhatsApp, atau jabatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-gray-400)',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)', whiteSpace: 'nowrap' }}>
              Menampilkan {filteredEmployees.length} dari {totalCount} data
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Data Guru */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>No</th>
                <th>Nama Lengkap</th>
                <th>NIP</th>
                <th>Pangkat / Golongan</th>
                <th>Jabatan / Unit</th>
                <th>No. WhatsApp</th>
                <th>Status</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }} />
                    <span style={{ color: 'var(--color-gray-500)' }}>Memuat data guru & tendik...</span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-gray-400)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    <div>Tidak ada data guru/pemohon yang sesuai dengan kata kunci pencarian.</div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} style={{ opacity: emp.isActive ? 1 : 0.6 }}>
                    <td style={{ textAlign: 'center', color: 'var(--color-gray-400)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-gray-900)' }}>{emp.name}</div>
                    </td>
                    <td>
                      {emp.nip ? (
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{emp.nip}</span>
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>-</span>
                      )}
                    </td>
                    <td>{emp.pangkatGol || <span style={{ color: 'var(--color-gray-400)' }}>-</span>}</td>
                    <td>
                      <div>{emp.jabatan || 'Guru / Tendik'}</div>
                      {emp.unit && emp.unit !== 'SMK Negeri 1 Subang' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>{emp.unit}</div>
                      )}
                    </td>
                    <td>
                      {emp.phoneWa ? (
                        <a
                          href={`https://wa.me/${emp.phoneWa.replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: '#059669',
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: '0.8125rem',
                          }}
                        >
                          💬 {emp.phoneWa}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${emp.isActive ? 'status-approved' : 'status-cancelled'}`} style={{ fontSize: '0.75rem' }}>
                        {emp.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(emp)}
                          title="Edit Data Guru"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(emp)}
                          disabled={deletingId === emp.id}
                          title="Hapus Data Guru"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          {deletingId === emp.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-container"
            style={{ maxWidth: '560px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{editingId ? '✏️ Edit Data Guru & Pemohon' : '➕ Tambah Guru / Tendik Baru'}</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">
                    Nama Lengkap Beserta Gelar <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Deden Suryanto, M.Pd"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">NIP</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="19xxxxxxxxxxxxxx"
                      value={form.nip}
                      onChange={(e) => setForm({ ...form, nip: e.target.value })}
                    />
                    <span className="form-hint">Kosongkan jika belum memiliki NIP</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="Contoh: 08123456789"
                      value={form.phoneWa}
                      onChange={(e) => setForm({ ...form, phoneWa: e.target.value })}
                    />
                    <span className="form-hint">Format Indonesia (diawali 08/62)</span>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Pangkat / Golongan</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Penata Muda / III/a"
                      value={form.pangkatGol}
                      onChange={(e) => setForm({ ...form, pangkatGol: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Jabatan</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Guru Ahli Muda, Kepala Program"
                      value={form.jabatan}
                      onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit / Bagian</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: SMK Negeri 1 Subang"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status Aktif (Bisa dipilih di form peminjaman)</span>
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary${saving ? ' btn-loading' : ''}`}
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : '💾 Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
