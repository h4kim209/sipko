'use client'
// src/components/admin/cancel-booking-action.tsx — Action button to cancel an approved or pending booking

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  bookingCode: string
  bookingId?: string
  currentStatus: string
  compact?: boolean
}

export function CancelBookingAction({ bookingCode, bookingId, currentStatus, compact = false }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Alasan pembatalan wajib diisi.')
      return
    }

    if (!confirm(`Konfirmasi pembatalan peminjaman ${bookingCode}? Status akan diubah menjadi DIBATALKAN dan alokasi kendaraan akan dibebaskan.`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingCode, bookingId, reason: reason.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal membatalkan booking.')
        return
      }

      setIsOpen(false)
      setReason('')
      router.refresh()
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi.')
    } finally {
      setLoading(false)
    }
  }

  if (compact) {
    if (isOpen) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: '180px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Alasan pembatalan..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.5rem' }}
            autoFocus
          />
          {error && <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)' }}>{error}</span>}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              className={`btn btn-danger btn-sm${loading ? ' btn-loading' : ''}`}
              onClick={handleCancel}
              disabled={loading}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              Ya, Batalkan
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setIsOpen(false); setError(''); setReason('') }}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              Tutup
            </button>
          </div>
        </div>
      )
    }

    return (
      <button
        className="btn btn-outline-danger btn-sm"
        onClick={() => setIsOpen(true)}
        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
        title="Batalkan persetujuan / batalkan pengajuan ini"
      >
        ⚠️ Batalkan
      </button>
    )
  }

  // Full Mode (Halaman Detail)
  return (
    <div>
      {!isOpen ? (
        <button
          className="btn btn-danger btn-sm"
          onClick={() => setIsOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <span>⚠️</span> Batalkan Persetujuan / Cabut Booking
        </button>
      ) : (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            maxWidth: '500px',
          }}
        >
          <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
            Konfirmasi Pembatalan Booking ({bookingCode})
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-600)', marginBottom: 'var(--space-3)' }}>
            Status peminjaman saat ini adalah <strong>{currentStatus}</strong>. Membatalkan akan mencabut alokasi kendaraan dan mengirimkan notifikasi resmi ke WhatsApp pemohon.
          </p>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
              Alasan Pembatalan <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Contoh: Terjadi kesalahan pemilihan armada / Dinas mendadak dialihkan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', fontSize: 'var(--font-size-xs)', resize: 'vertical' }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', marginBottom: 'var(--space-2)' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className={`btn btn-danger btn-sm${loading ? ' btn-loading' : ''}`}
              onClick={handleCancel}
              disabled={loading}
            >
              {loading ? 'Memproses...' : 'Konfirmasi Batalkan Booking'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setIsOpen(false); setError(''); setReason('') }}
              disabled={loading}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
