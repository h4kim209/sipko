'use client'
// app/admin/kendaraan/page.tsx — Manajemen Data Kendaraan

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Vehicle = {
  id: string
  name: string
  brand: string
  type: string
  plateNumber: string
  year: number | null
  color: string | null
  fuelType: string | null
  seatCapacity: number | null
  currentOdometer: number | null
  status: string
  createdAt: string
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: 'Tersedia', cls: 'status-approved' },
  IN_USE: { label: 'Digunakan', cls: 'status-active' },
  MAINTENANCE: { label: 'Maintenance', cls: 'status-revision' },
  RETIRED: { label: 'Non-Aktif', cls: 'status-cancelled' },
}

const FUEL_TYPES = ['Bensin', 'Solar', 'Gas', 'Listrik']
const VEHICLE_TYPES = ['Sedan', 'SUV', 'MPV', 'Pickup', 'Bus', 'Minibus', 'Van', 'Lainnya']

export default function KendaraanPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const emptyForm = {
    name: '', brand: '', type: '', plateNumber: '', year: '',
    color: '', fuelType: '', seatCapacity: '', currentOdometer: '', status: 'AVAILABLE',
  }
  const [form, setForm] = useState(emptyForm)

  const loadVehicles = async () => {
    try {
      const res = await fetch('/api/admin/vehicles')
      const data = await res.json()
      setVehicles(data.vehicles || [])
    } catch {
      setError('Gagal memuat data kendaraan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVehicles() }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  const openEdit = (v: Vehicle) => {
    setForm({
      name: v.name,
      brand: v.brand,
      type: v.type,
      plateNumber: v.plateNumber,
      year: v.year?.toString() || '',
      color: v.color || '',
      fuelType: v.fuelType || '',
      seatCapacity: v.seatCapacity?.toString() || '',
      currentOdometer: v.currentOdometer?.toString() || '',
      status: v.status,
    })
    setEditingId(v.id)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.brand.trim() || !form.plateNumber.trim()) {
      setError('Nama, merek, dan nomor polisi wajib diisi.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const url = editingId ? `/api/admin/vehicles/${editingId}` : '/api/admin/vehicles'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
          seatCapacity: form.seatCapacity ? parseInt(form.seatCapacity) : null,
          currentOdometer: form.currentOdometer ? parseInt(form.currentOdometer) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return }
      setMessage(editingId ? 'Data kendaraan berhasil diperbarui.' : 'Kendaraan berhasil ditambahkan.')
      setShowForm(false)
      loadVehicles()
    } catch {
      setError('Gagal menyimpan. Periksa koneksi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kendaraan "${name}"? Data yang sudah terkait booking tidak akan terhapus.`)) return
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: 'DELETE' })
      if (!res.ok) { setError('Gagal menghapus.'); return }
      setMessage('Kendaraan berhasil dihapus.')
      loadVehicles()
    } catch {
      setError('Gagal menghapus.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🚙 Data Kendaraan</h1>
          <p className="page-subtitle">Kelola armada kendaraan operasional sekolah.</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          ➕ Tambah Kendaraan
        </button>
      </div>

      {message && <div className="alert alert-success" style={{ marginBottom: 'var(--space-4)' }}><span>✅</span> {message}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}><span>⚠️</span> {error}</div>}

      {/* Form modal */}
      {showForm && (
        <div className="card animate-slide-up" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header">
            <h3>{editingId ? '✏️ Edit Kendaraan' : '➕ Tambah Kendaraan Baru'}</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}>✕</button>
          </div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Nama Kendaraan <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: Mobil Dinas 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Merek <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: Toyota" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tipe</label>
                <select className="form-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="">-- Pilih Tipe --</option>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nomor Polisi <span className="required">*</span></label>
                <input className="form-input" placeholder="Contoh: D 1234 AB" value={form.plateNumber} onChange={e => setForm(f => ({ ...f, plateNumber: e.target.value.toUpperCase() }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Tahun</label>
                <input className="form-input" type="number" placeholder="2020" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Warna</label>
                <input className="form-input" placeholder="Contoh: Putih" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Bahan Bakar</label>
                <select className="form-select" value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}>
                  <option value="">-- Pilih --</option>
                  {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Kapasitas Kursi</label>
                <input className="form-input" type="number" min="1" placeholder="7" value={form.seatCapacity} onChange={e => setForm(f => ({ ...f, seatCapacity: e.target.value }))} />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Odometer Saat Ini (km)</label>
                <input className="form-input" type="number" min="0" placeholder="45000" value={form.currentOdometer} onChange={e => setForm(f => ({ ...f, currentOdometer: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="AVAILABLE">Tersedia</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RETIRED">Non-Aktif</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Batal</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : editingId ? '💾 Simpan Perubahan' : '➕ Tambah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-container"><div className="loading-spinner" /><span>Memuat data kendaraan...</span></div>
      ) : vehicles.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">🚙</div>
          <div className="empty-state-title">Belum ada kendaraan terdaftar</div>
          <p>Tambahkan kendaraan operasional terlebih dahulu.</p>
        </div></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Merek / Tipe</th>
                <th>Nopol</th>
                <th>Tahun</th>
                <th>BBM</th>
                <th>Kapasitas</th>
                <th>Odometer</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 600 }}>{v.name}</td>
                  <td style={{ fontSize: 'var(--font-size-sm)' }}>{v.brand} {v.type}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.plateNumber}</td>
                  <td>{v.year || '-'}</td>
                  <td>{v.fuelType || '-'}</td>
                  <td>{v.seatCapacity || '-'}</td>
                  <td>{v.currentOdometer ? `${v.currentOdometer.toLocaleString('id-ID')} km` : '-'}</td>
                  <td>
                    <span className={`badge ${STATUS_MAP[v.status]?.cls || ''}`}>
                      {STATUS_MAP[v.status]?.label || v.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(v)} style={{ fontSize: '0.75rem' }}>✏️ Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v.id, v.name)} style={{ fontSize: '0.75rem' }}>🗑️</button>
                    </div>
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
