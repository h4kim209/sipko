'use client'
// src/components/admin/calendar-view.tsx — Kalender Bulanan Grid Adaptif & Responsif (Web & Mobile)

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Vehicle = { id: string; name: string; plateNumber: string; brand?: string; type?: string }
type Booking = {
  id: string
  bookingCode: string
  vehicleId: string
  applicantName: string
  destinationName: string
  departureDatetime: string
  returnDatetime: string
  status: string
  driverName?: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu Persetujuan', color: '#b45309', bg: '#fef3c7', dot: '#f59e0b' },
  DISETUJUI: { label: 'Disetujui', color: '#047857', bg: '#d1fae5', dot: '#10b981' },
  MENUNGGU_PEMERIKSAAN_AWAL: { label: 'Pemeriksaan Awal', color: '#4338ca', bg: '#e0e7ff', dot: '#6366f1' },
  SIAP_BERANGKAT: { label: 'Siap Berangkat', color: '#0369a1', bg: '#e0f2fe', dot: '#0ea5e9' },
  SEDANG_DIGUNAKAN: { label: 'Sedang Digunakan', color: '#0f766e', bg: '#ccfbf1', dot: '#0d9488' },
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: { label: 'Pemeriksaan Kembali', color: '#c2410c', bg: '#ffedd5', dot: '#f97316' },
  PERLU_PERBAIKAN_BUKTI: { label: 'Perlu Perbaikan Bukti', color: '#b91c1c', bg: '#fee2e2', dot: '#ef4444' },
  SELESAI: { label: 'Selesai', color: '#374151', bg: '#f3f4f6', dot: '#6b7280' },
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Dimulai dari Minggu (Min) sampai Sabtu (Sab) seperti kalender standar
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

type Props = { vehicles: Vehicle[]; bookings: Booking[] }

export function CalendarView({ vehicles, bookings }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Filter booking berdasarkan kendaraan jika filter aktif
  const filteredBookings = useMemo(() => {
    if (vehicleFilter === 'ALL') return bookings
    return bookings.filter((b) => b.vehicleId === vehicleFilter)
  }, [bookings, vehicleFilter])

  // Menghasilkan sel-sel kalender (termasuk tanggal bulan sebelum dan sesudah agar genap kelipatan 7)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Minggu
    const lastDate = new Date(year, month + 1, 0).getDate()
    const prevLastDate = new Date(year, month, 0).getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Tanggal bulan sebelumnya (padding awal)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevLastDate - i),
        isCurrentMonth: false,
      })
    }

    // Tanggal bulan sekarang
    for (let i = 1; i <= lastDate; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      })
    }

    // Tanggal bulan berikutnya (padding akhir hingga genap 35 atau 42 kotak)
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        })
      }
    }

    return days
  }, [year, month])

  // Cari booking pada tanggal tertentu
  const getBookingsForDate = (date: Date) => {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return filteredBookings.filter((b) => {
      const dep = new Date(b.departureDatetime)
      const ret = new Date(b.returnDatetime)
      return dep <= end && ret >= start
    })
  }

  const isToday = (d: Date) => {
    const now = new Date()
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
  }

  const isSelected = (d: Date) => {
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    )
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToday = () => {
    const now = new Date()
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  // Booking pada tanggal yang sedang di-klik/dipilih
  const selectedDateBookings = useMemo(() => {
    return getBookingsForDate(selectedDate)
  }, [selectedDate, filteredBookings])

  const formatShortTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* CARD UTAMA KALENDER */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* HEADER KALENDER BULANAN */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Judul Bulan & Tahun */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {MONTH_NAMES[month]} {year}
            </div>
            <button
              onClick={goToday}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Hari Ini
            </button>
          </div>

          {/* Navigasi Bulan & Filter Armada */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Filter Armada */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}
            >
              <option value="ALL">🚗 Semua Armada ({vehicles.length})</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plateNumber})
                </option>
              ))}
            </select>

            {/* Tombol Panah Bulan */}
            <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                onClick={prevMonth}
                title="Bulan sebelumnya"
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRight: '1px solid #cbd5e1',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#334155',
                }}
              >
                ▲
              </button>
              <button
                onClick={nextMonth}
                title="Bulan berikutnya"
                style={{
                  background: '#ffffff',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: '#334155',
                }}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* NAMA HARI (Min, Sen, Sel, Rab, Kam, Jum, Sab) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '0.8125rem',
            color: '#475569',
            padding: '0.625rem 0',
          }}
        >
          {DAY_LABELS.map((day, idx) => (
            <div key={day} style={{ color: idx === 0 ? '#dc2626' : idx === 6 ? '#2563eb' : '#475569' }}>
              {day}
            </div>
          ))}
        </div>

        {/* GRID TANGGAL KALENDER */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            borderCollapse: 'collapse',
            background: '#e2e8f0',
            gap: '1px',
          }}
        >
          {calendarDays.map((item, index) => {
            const dayBookings = getBookingsForDate(item.date)
            const dayToday = isToday(item.date)
            const daySelected = isSelected(item.date)
            const isSunday = item.date.getDay() === 0
            const isSaturday = item.date.getDay() === 6

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDate(item.date)
                  if (!item.isCurrentMonth) {
                    setCurrentDate(new Date(item.date.getFullYear(), item.date.getMonth(), 1))
                  }
                }}
                style={{
                  background: daySelected
                    ? '#eff6ff'
                    : dayToday
                    ? '#f0fdfa'
                    : item.isCurrentMonth
                    ? '#ffffff'
                    : '#f8fafc',
                  minHeight: '85px',
                  padding: '0.375rem 0.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  outline: daySelected ? '2px solid #2563eb' : dayToday ? '2px solid #0d9488' : 'none',
                  outlineOffset: '-2px',
                  transition: 'background 0.15s ease',
                  opacity: item.isCurrentMonth ? 1 : 0.45,
                }}
              >
                {/* Baris Atas: Angka Tanggal & Badge Hari Ini */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '0.925rem',
                      fontWeight: dayToday || daySelected ? 800 : 600,
                      color: daySelected
                        ? '#1d4ed8'
                        : dayToday
                        ? '#0f766e'
                        : isSunday
                        ? '#dc2626'
                        : isSaturday
                        ? '#2563eb'
                        : '#1e293b',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: dayToday ? '#ccfbf1' : 'transparent',
                    }}
                  >
                    {item.date.getDate()}
                  </span>

                  {dayToday && (
                    <span
                      style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: '#0d9488',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Kini
                    </span>
                  )}
                </div>

                {/* Indikator Jadwal Armada pada Kotak Tanggal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                  {/* Tampilan Desktop: Pill Ringkas Armada */}
                  <div className="hidden md:flex" style={{ flexDirection: 'column', gap: '2px' }}>
                    {dayBookings.slice(0, 2).map((b) => {
                      const veh = vehicles.find((v) => v.id === b.vehicleId)
                      const conf = STATUS_CONFIG[b.status] || { color: '#334155', bg: '#f1f5f9' }
                      return (
                        <div
                          key={b.id}
                          style={{
                            fontSize: '0.625rem',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            background: conf.bg,
                            color: conf.color,
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                          }}
                          title={`[${b.bookingCode}] ${veh?.name || 'Mobil'} - ${b.applicantName}`}
                        >
                          🚗 {veh?.name?.split(' ')[0] || 'Armada'}: {b.applicantName.split(' ')[0]}
                        </div>
                      )
                    })}
                    {dayBookings.length > 2 && (
                      <div style={{ fontSize: '0.6rem', color: '#0d9488', fontWeight: 800, textAlign: 'center' }}>
                        +{dayBookings.length - 2} lagi
                      </div>
                    )}
                  </div>

                  {/* Tampilan Mobile: Titik Status Berwarna / Counter */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {dayBookings.slice(0, 4).map((b) => {
                      const conf = STATUS_CONFIG[b.status] || { dot: '#64748b' }
                      return (
                        <span
                          key={b.id}
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: conf.dot,
                            display: 'inline-block',
                          }}
                          title={b.applicantName}
                        />
                      )
                    })}
                    {dayBookings.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 800,
                          color: '#0d9488',
                          marginLeft: '2px',
                        }}
                      >
                        {dayBookings.length}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DETAIL JADWAL TANGGAL TERPILIH */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingBottom: '0.875rem',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Rincian Penggunaan Armada
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
              📅 {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
          </div>

          <span
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: selectedDateBookings.length > 0 ? '#ccfbf1' : '#f1f5f9',
              color: selectedDateBookings.length > 0 ? '#0f766e' : '#64748b',
            }}
          >
            {selectedDateBookings.length > 0
              ? `${selectedDateBookings.length} Armada Terjadwal`
              : 'Semua Armada Tersedia'}
          </span>
        </div>

        {selectedDateBookings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#64748b',
              background: '#f8fafc',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px dashed #cbd5e1',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✨</div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>Tidak ada peminjaman pada tanggal ini</div>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: '#64748b' }}>
              Seluruh armada kendaraan operasional berstatus siap dan tersedia untuk dipinjam.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {selectedDateBookings.map((b) => {
              const veh = vehicles.find((v) => v.id === b.vehicleId)
              const conf = STATUS_CONFIG[b.status] || { label: b.status, color: '#334155', bg: '#f1f5f9', dot: '#64748b' }

              return (
                <div
                  key={b.id}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 'var(--radius-lg, 12px)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div>
                    {/* Header Item: Kendaraan & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                          🚗 {veh?.name || 'Kendaraan Dinas'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                          {veh?.plateNumber} • Kode: <strong>{b.bookingCode}</strong>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.675rem',
                          fontWeight: 700,
                          background: conf.bg,
                          color: conf.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conf.label}
                      </span>
                    </div>

                    {/* Informasi Pemohon & Jadwal */}
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.625rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        display: 'grid',
                        gap: '0.375rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>👤 Pemohon:</span>
                        <strong style={{ color: '#0f172a' }}>{b.applicantName}</strong>
                      </div>
                      {b.driverName && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>👨‍✈️ Pengemudi:</span>
                          <span style={{ color: '#334155' }}>{b.driverName}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>📍 Tujuan:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{b.destinationName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '80px', flexShrink: 0 }}>⏱️ Jadwal:</span>
                        <span style={{ color: '#0d9488', fontWeight: 700 }}>
                          {formatShortTime(b.departureDatetime)} — {formatShortTime(b.returnDatetime)} WIB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <Link
                      href={`/admin/pengajuan/${b.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                    >
                      Buka Rincian Pengajuan →
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* KETERANGAN WARNA STATUS */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          padding: '0.875rem 1.25rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid #e2e8f0',
          fontSize: '0.75rem',
        }}
      >
        <span style={{ fontWeight: 700, color: '#334155' }}>Keterangan Warna:</span>
        {Object.entries(STATUS_CONFIG).map(([status, conf]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: conf.dot,
                display: 'inline-block',
              }}
            />
            <span style={{ color: '#475569', fontWeight: 500 }}>{conf.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
