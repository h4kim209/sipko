'use client'
// src/components/admin/review-actions.tsx — Aksi review pemeriksaan pengembalian

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  bookingId: string
  bookingCode: string
  inspectionId?: string
}

export function ReviewActions({ bookingId, bookingCode, inspectionId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRevision, setShowRevision] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState('')
  const [error, setError] = useState('')

  const handleComplete = async () => {
    if (!confirm(`Selesaikan booking ${bookingCode}? Kendaraan akan dikembalikan ke status tersedia.`)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, inspectionId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal menyelesaikan.'); return }
      router.refresh()
    } catch {
      setError('Gagal. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const handleRevision = async () => {
    if (!revisionNotes.trim()) { setError('Catatan revisi wajib diisi.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/bookings/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, inspectionId, notes: revisionNotes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal meminta revisi.'); return }
      router.refresh()
    } catch {
      setError('Gagal. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="alert alert-danger" style={{ marginBottom: 'var(--space-3)' }}><span>⚠️</span> {error}</div>}

      {showRevision ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Jelaskan apa yang perlu diperbaiki oleh pemohon..."
            value={revisionNotes}
            onChange={e => setRevisionNotes(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <button className={`btn btn-warning${loading ? ' btn-loading' : ''}`} onClick={handleRevision} disabled={loading}>
              📝 Kirim Permintaan Revisi
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowRevision(false); setError('') }}>
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button className={`btn btn-primary${loading ? ' btn-loading' : ''}`} onClick={handleComplete} disabled={loading}>
            ✅ Selesai & Kembalikan Kendaraan
          </button>
          <button className="btn btn-warning" onClick={() => setShowRevision(true)}>
            🔄 Minta Perbaikan Bukti
          </button>
        </div>
      )}
    </div>
  )
}
