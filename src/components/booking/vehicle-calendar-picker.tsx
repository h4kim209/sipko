'use client'
// src/components/booking/vehicle-calendar-picker.tsx
// Visualizer kalender ketersediaan tanggal kendaraan & penetapan jadwal terpadu

import { useState, useEffect, useMemo } from 'react'

type BookingSchedule = {
  bookingCode: string
  applicantName: string
  destinationName: string
  departureDatetime: string
  returnDatetime: string
  status: string
  isApproved: boolean
}

type Props = {
  vehicleId: string
  vehicleName: string
  plateNumber: string
  departureValue: string
  returnValue: string
  minDatetime?: string
  departureError?: string
  returnError?: string
  onDepartureChange: (val: string) => void
  onReturnChange: (val: string) => void
  onSelectDateRange?: (depDate: string, retDate: string) => void
}

export function VehicleCalendarPicker({
  vehicleId,
  vehicleName,
  plateNumber,
  departureValue,
  returnValue,
  minDatetime,
  departureError,
  returnError,
  onDepartureChange,
  onReturnChange,
  onSelectDateRange,
}: Props) {
  const [schedules, setSchedules] = useState<BookingSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  // Fetch jadwal pemakaian kendaraan saat vehicleId berubah
  useEffect(() => {
    if (!vehicleId) {
      setSchedules([])
      return
    }

    let isMounted = true
    setLoading(true)

    fetch(`/api/vehicles/${vehicleId}/schedule`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setSchedules(data.bookings || [])
        }
      })
      .catch((err) => console.error('Gagal memuat jadwal kendaraan:', err))
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [vehicleId])

  // Hitung hari-hari dalam bulan yang aktif
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Minggu
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ dayNumber: null, date: null })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d)
      dateObj.setHours(0, 0, 0, 0)

      const isPast = dateObj < today

      let bookedInfo: BookingSchedule | null = null
      let isPending = false

      for (const s of schedules) {
        const start = new Date(s.departureDatetime)
        start.setHours(0, 0, 0, 0)
        const end = new Date(s.returnDatetime)
        end.setHours(23, 59, 59, 999)

        if (dateObj >= start && dateObj <= end) {
          bookedInfo = s
          if (!s.isApproved) isPending = true
          break
        }
      }

      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      days.push({
        dayNumber: d,
        date: dateObj,
        dateString,
        isPast,
        isBooked: Boolean(bookedInfo && bookedInfo.isApproved),
        isPending: Boolean(bookedInfo && !bookedInfo.isApproved),
        bookedInfo,
      })
    }

    return days
  }, [currentMonth, schedules])

  // Deteksi tabrakan jadwal dengan input formulir saat ini
  const clashWarning = useMemo(() => {
    if (!departureValue || !returnValue || schedules.length === 0) return null

    const dep = new Date(departureValue).getTime()
    const ret = new Date(returnValue).getTime()

    if (isNaN(dep) || isNaN(ret) || dep >= ret) return null

    for (const s of schedules) {
      if (!s.isApproved) continue // Hanya cek bentrok dengan yang sudah disetujui / aktif
      const sDep = new Date(s.departureDatetime).getTime()
      const sRet = new Date(s.returnDatetime).getTime()

      if (dep < sRet && ret > sDep) {
        return `Armada "${vehicleName}" sudah terisi jadwal peminjaman ${s.bookingCode} (Tujuan: ${s.destinationName}) pada waktu tersebut. Silakan pilih tanggal atau jam lain yang tersedia.`
      }
    }
    return null
  }, [departureValue, returnValue, schedules, vehicleName])

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const monthLabel = currentMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

  // Format durasi pemakaian
  const durationText = useMemo(() => {
    if (!departureValue || !returnValue) return null
    const dep = new Date(departureValue)
    const ret = new Date(returnValue)
    const diffMs = ret.getTime() - dep.getTime()
    if (diffMs <= 0 || isNaN(diffMs)) return null

    const hours = Math.round(diffMs / (1000 * 60 * 60))
    if (hours < 24) {
      return `Estimasi Durasi: ${hours} Jam pemakaian`
    }
    const days = Math.floor(hours / 24)
    const remHours = hours % 24
    return `Estimasi Durasi: ${days} Hari ${remHours > 0 ? `${remHours} Jam` : ''}`
  }, [departureValue, returnValue])

  return (
    <div
      style={{
        background: '#ffffff',
        border: clashWarning ? '2px solid #ef4444' : '1.5px solid #0d9488',
        borderRadius: 'var(--radius-xl, 14px)',
        padding: '1.25rem',
        marginTop: '1rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)',
      }}
    >
      {/* Header Kalender */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>📅</span> Kalender Ketersediaan: <span style={{ color: '#0d9488' }}>{vehicleName}</span> ({plateNumber})
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Klik tanggal hijau untuk langsung menentukan jadwal keberangkatan & kepulangan Anda.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <button
            type="button"
            onClick={prevMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            ←
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.8125rem', minWidth: '120px', textAlign: 'center', color: '#1e293b' }}>
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            →
          </button>
        </div>
      </div>

      {/* Legenda Warna */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '12px', height: '12px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '3px' }} />
          <span style={{ color: '#166534', fontWeight: 600 }}>Tersedia (Hijau)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '12px', height: '12px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px' }} />
          <span style={{ color: '#991b1b', fontWeight: 600 }}>Sudah Dipesan (Merah)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ width: '12px', height: '12px', background: '#ffedd5', border: '1px solid #fdba74', borderRadius: '3px' }} />
          <span style={{ color: '#9a3412', fontWeight: 600 }}>Antrean Ajuan (Oranye)</span>
        </div>
      </div>

      {/* Grid Kalender */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          ⏳ Memeriksa jadwal ketersediaan armada...
        </div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          {/* Header Hari */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>
            <div>SEN</div>
            <div>SEL</div>
            <div>RAB</div>
            <div>KAM</div>
            <div>JUM</div>
            <div style={{ color: '#0d9488' }}>SAB</div>
            <div style={{ color: '#ef4444' }}>MIN</div>
          </div>

          {/* Kotak Tanggal */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {calendarDays.map((item, idx) => {
              if (!item.date || item.dayNumber === null) {
                return <div key={`empty-${idx}`} style={{ minHeight: '38px', background: 'transparent' }} />
              }

              let bg = '#dcfce7' // Default Hijau (Tersedia)
              let border = '#86efac'
              let textColor = '#166534'
              let cursor = 'pointer'
              let title = 'Tersedia — Klik untuk memilih'

              if (item.isPast) {
                bg = '#f1f5f9'
                border = '#e2e8f0'
                textColor = '#94a3b8'
                cursor = 'not-allowed'
                title = 'Tanggal sudah lewat'
              } else if (item.isBooked) {
                bg = '#fee2e2' // Merah
                border = '#fca5a5'
                textColor = '#991b1b'
                cursor = 'not-allowed'
                title = `Sudah dibooking: ${item.bookedInfo?.destinationName} (${item.bookedInfo?.applicantName})`
              } else if (item.isPending) {
                bg = '#ffedd5' // Oranye
                border = '#fdba74'
                textColor = '#9a3412'
                title = `Menunggu persetujuan: ${item.bookedInfo?.destinationName}`
              }

              const isSelected =
                Boolean(item.dateString && departureValue && departureValue.startsWith(item.dateString)) ||
                Boolean(item.dateString && returnValue && returnValue.startsWith(item.dateString))

              return (
                <div
                  key={`day-${item.dayNumber}`}
                  title={title}
                  onClick={() => {
                    if (item.isPast || item.isBooked || !item.dateString) return
                    
                    // One-Click: Otomatis set tanggal berangkat jam 08:00 dan kembali jam 16:00
                    const newDep = `${item.dateString}T08:00`
                    const newRet = `${item.dateString}T16:00`

                    onDepartureChange(newDep)
                    onReturnChange(newRet)

                    if (onSelectDateRange) {
                      onSelectDateRange(newDep, newRet)
                    }
                  }}
                  style={{
                    minHeight: '38px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isSelected ? '#0d9488' : bg,
                    border: isSelected ? '2px solid #0f766e' : `1px solid ${border}`,
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? '#ffffff' : textColor,
                    cursor,
                    position: 'relative',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(13, 148, 136, 0.35)' : 'none',
                  }}
                >
                  <span>{item.dayNumber}</span>
                  {item.isBooked && (
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: '#ef4444' }}>PADAT</span>
                  )}
                  {isSelected && (
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#ffffff' }}>DIPILIH</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Peringatan Bentrok Jadwal */}
      {clashWarning && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #f87171',
            color: '#991b1b',
            borderRadius: 'var(--radius-md)',
            padding: '0.625rem 0.875rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>⚠️</span>
          <div>{clashWarning}</div>
        </div>
      )}

      {/* Pilihan Waktu Keberangkatan & Kepulangan Terpadu (UNIFIED) */}
      <div
        style={{
          marginTop: '0.875rem',
          paddingTop: '0.875rem',
          borderTop: '1px dashed #cbd5e1',
          background: '#f8fafc',
          padding: '1rem',
          borderRadius: 'var(--radius-md, 8px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
            ⏱️ Tentukan Waktu Berangkat & Pulang:
          </div>
          {durationText && (
            <span className="badge status-approved" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {durationText}
            </span>
          )}
        </div>

        <div className="grid-2" style={{ gap: '0.875rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Tanggal & Jam Berangkat <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="datetime-local"
              className={`form-input${departureError ? ' error' : ''}`}
              min={minDatetime}
              value={departureValue}
              onChange={(e) => onDepartureChange(e.target.value)}
              style={{ background: '#ffffff', fontSize: '0.8125rem' }}
            />
            {departureError ? (
              <span className="form-error" style={{ fontSize: '0.7rem' }}>⚠ {departureError}</span>
            ) : (
              <span className="form-hint" style={{ fontSize: '0.7rem' }}>Waktu armada mulai meninggalkan sekolah</span>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Tanggal & Jam Kembali <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="datetime-local"
              className={`form-input${returnError ? ' error' : ''}`}
              min={departureValue || minDatetime}
              value={returnValue}
              onChange={(e) => onReturnChange(e.target.value)}
              style={{ background: '#ffffff', fontSize: '0.8125rem' }}
            />
            {returnError ? (
              <span className="form-error" style={{ fontSize: '0.7rem' }}>⚠ {returnError}</span>
            ) : (
              <span className="form-hint" style={{ fontSize: '0.7rem' }}>Perkiraan armada tiba kembali di sekolah</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
