'use client'
// src/components/admin/inspection-gallery.tsx
// Komponen galeri foto pemeriksaan kendaraan untuk Admin & Kepala Sekolah

import { useState } from 'react'

export type PhotoItem = {
  id: string
  category: string
  filePath?: string
  fileSize?: number
  mimeType?: string
  uploadedAt?: Date | string
}

const CATEGORY_LABELS: Record<string, { label: string; badgeClass: string; icon: string }> = {
  SPEEDOMETER_PRE: { label: 'Speedometer Awal', badgeClass: 'status-approved', icon: '⏱️' },
  SPEEDOMETER_POST: { label: 'Speedometer Akhir', badgeClass: 'status-done', icon: '⏱️' },
  INTERIOR_FRONT_PRE: { label: 'Interior Depan (Awal)', badgeClass: 'status-inspection', icon: '🪑' },
  INTERIOR_FRONT_POST: { label: 'Interior Depan (Akhir)', badgeClass: 'status-return', icon: '🪑' },
  SEAT_REAR_PRE: { label: 'Jok Belakang (Awal)', badgeClass: 'status-inspection', icon: '🛋️' },
  SEAT_REAR_POST: { label: 'Jok Belakang (Akhir)', badgeClass: 'status-return', icon: '🛋️' },
  EXTERIOR_PRE: { label: 'Eksterior/Kebersihan (Awal)', badgeClass: 'status-inspection', icon: '🚗' },
  EXTERIOR_POST: { label: 'Eksterior/Kebersihan (Akhir)', badgeClass: 'status-return', icon: '🚗' },
  FUEL_RECEIPT: { label: 'Struk BBM', badgeClass: 'status-ready', icon: '⛽' },
  OTHER: { label: 'Lainnya', badgeClass: 'status-pending', icon: '📷' },
}

export function InspectionGallery({
  photos,
  title,
}: {
  photos: PhotoItem[]
  title?: string
}) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  if (!photos || photos.length === 0) {
    return (
      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
        Belum ada foto yang diunggah.
      </div>
    )
  }

  const selectedPhoto = selectedIdx !== null ? photos[selectedIdx] : null

  return (
    <div>
      {title && (
        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-gray-600)', marginBottom: '0.5rem' }}>
          {title} ({photos.length} foto)
        </div>
      )}

      {/* Grid Thumbnail Foto */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.5rem',
        }}
      >
        {photos.map((photo, idx) => {
          const cat = CATEGORY_LABELS[photo.category] || CATEGORY_LABELS.OTHER
          const photoUrl = `/api/inspections/photos/${photo.id}`

          return (
            <div
              key={photo.id}
              onClick={() => setSelectedIdx(idx)}
              style={{
                borderRadius: 'var(--radius-md, 8px)',
                overflow: 'hidden',
                border: '1px solid var(--color-gray-200, #e2e8f0)',
                background: '#fff',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Gambar Thumbnail */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '4/3',
                  background: 'var(--color-gray-100, #f1f5f9)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={photoUrl}
                  alt={cat.label}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 5px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                  }}
                >
                  🔍 Klik
                </span>
              </div>

              {/* Label Kategori */}
              <div style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cat.icon} {cat.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal / Lightbox Fullscreen saat foto diklik */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
        >
          {/* Header Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '850px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
              marginBottom: '0.75rem',
            }}
          >
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                {(CATEGORY_LABELS[selectedPhoto.category] || CATEGORY_LABELS.OTHER).icon}{' '}
                {(CATEGORY_LABELS[selectedPhoto.category] || CATEGORY_LABELS.OTHER).label}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', marginLeft: '0.75rem' }}>
                ({selectedIdx! + 1} dari {photos.length})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={`/api/inspections/photos/${selectedPhoto.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', background: '#334155', color: '#fff', borderColor: '#475569' }}
              >
                ↗️ Buka Tab Baru
              </a>
              <button
                onClick={() => setSelectedIdx(null)}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  width: '32px',
                  height: '32px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Area Gambar Utama */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '850px',
              maxHeight: '75vh',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Tombol Navigasi Prev */}
            {selectedIdx! > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIdx(selectedIdx! - 1)
                }}
                style={{
                  position: 'absolute',
                  left: '10px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                ‹
              </button>
            )}

            <img
              src={`/api/inspections/photos/${selectedPhoto.id}`}
              alt={(CATEGORY_LABELS[selectedPhoto.category] || CATEGORY_LABELS.OTHER).label}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              }}
            />

            {/* Tombol Navigasi Next */}
            {selectedIdx! < photos.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedIdx(selectedIdx! + 1)
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
