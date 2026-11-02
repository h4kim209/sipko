'use client'
// app/admin/pemohon/page.tsx — Manajemen Data Guru & Pemohon SIPKO

import { useState, useEffect, useMemo, useRef } from 'react'

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
  
  // Modal Tambah / Edit
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Modal Import Excel
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Handle Import File Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) {
      setError('Pilih berkas Excel terlebih dahulu.')
      return
    }

    setImporting(true)
    setImportResult(null)
    setError('')
    setMessage('')

    try {
      const fd = new FormData()
      fd.append('file', importFile)

      const res = await fetch('/api/admin/employees/import', {
        method: 'POST',
        body: fd,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mengimpor data Excel.')
        return
      }

      setMessage(data.message || 'Data Excel berhasil diimpor.')
      setImportResult(data.message)
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowImportModal(false)
      loadEmployees()
    } catch {
      setError('Terjadi kesalahan saat mengunggah dan mengimpor file Excel.')
    } finally {
      setImporting(false)
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">👨‍🏫 Data Guru & Pemohon</h1>
          <p className="page-subtitle">
            Kelola master data guru & tendik SMKN 1 Subang untuk pencarian dan autofill pada form pengajuan peminjaman.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Download Format / Template */}
          <a
            href="/api/admin/employees/template?type=blank"
            className="btn btn-secondary"
            title="Download Template Format Excel Kosong"
            style={{ fontSize: '0.8125rem' }}
          >
            📄 Format Template Excel
          </a>

          {/* Download Data Lengkap 180 Guru */}
          <a
            href="/api/admin/employees/template?type=full"
            className="btn btn-secondary"
            title="Download Data Lengkap Guru & Tendik (180 Pegawai)"
            style={{ fontSize: '0.8125rem' }}
          >
            📊 Download Data Lengkap
          </a>

          {/* Tombol Import Excel */}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setImportFile(null)
              setImportResult(null)
              setShowImportModal(true)
            }}
            style={{ fontSize: '0.8125rem', borderColor: 'var(--color-primary-400)', color: 'var(--color-primary-700)' }}
          >
            📥 Import Excel
          </button>

          {/* Tombol Tambah Manual */}
          <button className="btn btn-primary" onClick={openAdd} style={{ fontSize: '0.8125rem' }}>
            + Tambah Guru
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

      {/* MODAL 1: Tambah / Edit Guru (Opaque Solid White & Non-Transparent) */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal"
            style={{
              background: '#ffffff',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              maxWidth: '560px',
              width: '100%',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1060,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                {editingId ? '✏️ Edit Data Guru & Pemohon' : '➕ Tambah Guru / Tendik Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#ffffff' }}>
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
              <div className="modal-footer" style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

      {/* MODAL 2: Import Data Excel */}
      {showImportModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowImportModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1050,
            padding: '1rem',
          }}
        >
          <div
            className="modal"
            style={{
              background: '#ffffff',
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl, 16px)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              maxWidth: '560px',
              width: '100%',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              position: 'relative',
              zIndex: 1060,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ background: '#f8fafc', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                📥 Import Data Guru & Tendik dari Excel
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleImportSubmit}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff' }}>
                <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f766e', marginBottom: '0.25rem' }}>
                    💡 Petunjuk Format Berkas Excel
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#134e4a', lineHeight: 1.5 }}>
                    File Excel (.xlsx) harus memiliki kolom: <strong>Nama Lengkap</strong>, <strong>NIP</strong>, <strong>Pangkat / Golongan</strong>, <strong>Jabatan</strong>, dan <strong>Nomor WhatsApp</strong>.
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <a
                      href="/api/admin/employees/template?type=blank"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    >
                      ⬇️ Download Format Contoh (.xlsx)
                    </a>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Pilih File Excel (.xlsx / .xls) <span className="required">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="form-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0])
                      }
                    }}
                    required
                  />
                  {importFile && (
                    <span className="form-hint" style={{ color: '#0d9488', fontWeight: 600 }}>
                      ✓ Berkas dipilih: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                {importResult && (
                  <div className="alert alert-success" style={{ fontSize: '0.8125rem' }}>
                    <span>✅</span> {importResult}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowImportModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary${importing ? ' btn-loading' : ''}`}
                  disabled={importing || !importFile}
                >
                  {importing ? 'Memproses...' : '🚀 Mulai Import Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
