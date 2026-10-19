'use client'
// src/components/admin/approval-actions.tsx — Inline approve/reject buttons

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  bookingCode: string
  bookingId: string
}

export function ApprovalActions({ bookingCode, bookingId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [error, setError] = useState('')

  const handleApprove = async () => {
    if (!confirm(`Setujui pengajuan ${bookingCode}?`)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode, decision: 'APPROVE' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menyetujui.')
        return
      }
      router.refresh()
    } catch {
      setError('Gagal mengirim. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      setError('Alasan penolakan wajib diisi.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode, decision: 'REJECT', notes: rejectNotes }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal menolak.')
        return
      }
      router.refresh()
    } catch {
      setError('Gagal mengirim. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  if (showReject) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '200px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Alasan penolakan..."
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
          style={{ fontSize: 'var(--font-size-xs)', padding: '0.375rem 0.5rem' }}
        />
        {error && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)' }}>{error}</span>}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button
            className={`btn btn-danger btn-sm${loading ? ' btn-loading' : ''}`}
            onClick={handleReject}
            disabled={loading}
            style={{ fontSize: '0.7rem' }}
          >
            Tolak
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setShowReject(false); setError('') }}
            style={{ fontSize: '0.7rem' }}
          >
            Batal
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
      {error && <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', width: '100%' }}>{error}</span>}
      <button
        className={`btn btn-primary btn-sm${loading ? ' btn-loading' : ''}`}
        onClick={handleApprove}
        disabled={loading}
        style={{ fontSize: '0.75rem' }}
      >
        ✅ Setujui
      </button>
      <button
        className="btn btn-danger btn-sm"
        onClick={() => setShowReject(true)}
        style={{ fontSize: '0.75rem' }}
      >
        ❌ Tolak
      </button>
    </div>
  )
}
