'use client'
// src/components/admin/export-buttons.tsx — Tombol export Excel/PDF

import { useState } from 'react'

export function ExportButtons() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    setExporting(true)
    try {
      const res = await fetch(`/api/admin/reports/export?format=${format}`)
      if (!res.ok) { alert('Gagal mengekspor data.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laporan-sipko-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Gagal mengekspor.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button
        className={`btn btn-primary btn-sm${exporting ? ' btn-loading' : ''}`}
        onClick={() => handleExport('xlsx')}
        disabled={exporting}
      >
        📊 Export Excel
      </button>
      <button
        className={`btn btn-secondary btn-sm${exporting ? ' btn-loading' : ''}`}
        onClick={() => handleExport('pdf')}
        disabled={exporting}
      >
        📄 Export PDF
      </button>
    </div>
  )
}
