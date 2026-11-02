'use client'
// src/components/admin/calendar-view.tsx — Timeline & kalender kendaraan rentang 1 bulan penuh

import { useState, useMemo, useRef, useEffect } from 'react'
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu Persetujuan', color: '#b45309', bg: '#fef3c7' },
  DISETUJUI: { label: 'Disetujui', color: '#047857', bg: '#d1fae5' },
  MENUNGGU_PEMERIKSAAN_AWAL: { label: 'Pemeriksaan Awal', color: '#4338ca', bg: '#e0e7ff' },
  SIAP_BERANGKAT: { label: 'Siap Berangkat', color: '#0369a1', bg: '#e0f2fe' },
  SEDANG_DIGUNAKAN: { label: 'Sedang Digunakan', color: '#0f766e', bg: '#ccfbf1' },
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: { label: 'Pemeriksaan Kembali', color: '#c2410c', bg: '#ffedd5' },
  PERLU_PERBAIKAN_BUKTI: { label: 'Perlu Perbaikan Bukti', color: '#b91c1c', bg: '#fee2e2' },
  SELESAI: { label: 'Selesai', color: '#374151', bg: '#f3f4f6' },
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAY_NAMES = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB']

type Props = { vehicles: Vehicle[]; bookings: Booking[] }

export function CalendarView({ vehicles, bookings }: Props) {
  // Rentang bulan yang dipilih (default: bulan ini)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Tipe tampilan: matriks timeline armada atau kalender bulanan
  const [viewMode, setViewMode] = useState<'matrix' | 'calendar'>('matrix')

  const matrixScrollRef = useRef<HTMLDivElement>(null)
  const todayColumnRef = useRef<HTMLTableCellElement>(null)

  // Hitung semua tanggal dalam bulan yang aktif (1 s/d 28/29/30/31)
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const totalDays = new Date(year, month + 1, 0).getDate()

    return Array.from({ length: totalDays }, (_, i) => {
      return new Date(year, month, i + 1)
    })
  }, [currentMonth])

  // Filter booking yang aktif di bulan terpilih
  const monthBookings = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0)
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

    return bookings.filter((b) => {
      const dep = new Date(b.departureDatetime)
      const ret = new Date(b.returnDatetime)
      return dep <= endOfMonth && ret >= startOfMonth
    })
  }, [bookings, currentMonth])

  const isToday = (d: Date) => {
    const now = new Date()
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    )
  }

  // Auto-scroll ke kolom hari ini pada tampilan matriks jika di bulan sekarang
  useEffect(() => {
    if (viewMode === 'matrix' && todayColumnRef.current && matrixScrollRef.current) {
      const offsetLeft = todayColumnRef.current.offsetLeft
      matrixScrollRef.current.scrollTo({
        left: Math.max(0, offsetLeft - 240),
        behavior: 'smooth',
      })
    }
  }, [currentMonth, viewMode])

  const getBookingsForVehicleDay = (vehicleId: string, day: Date) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    return monthBookings.filter(
      (b) =>
        b.vehicleId === vehicleId &&
        new Date(b.departureDatetime) <= dayEnd &&
        new Date(b.returnDatetime) >= dayStart
    )
  }

  const getBookingsForDay = (day: Date) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    return monthBookings.filter(
      (b) =>
        new Date(b.departureDatetime) <= dayEnd &&
        new Date(b.returnDatetime) >= dayStart
    )
  }

  const prevMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const resetToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  // Format jam singkat HH:mm
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Bar Navigasi 1 Bulan & Pengatur Tampilan */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          background: '#ffffff',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-xl, 14px)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Tombol Navigasi Bulan */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth} title="Lihat bulan sebelumnya">
            ← Bulan Sebelumnya
          </button>
          <button className="btn btn-secondary btn-sm" onClick={resetToday}>
            Bulan Ini
          </button>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth} title="Lihat bulan berikutnya">
            Bulan Berikutnya →
          </button>
        </div>

        {/* Judul Bulan & Ringkasan */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
            Rentang 1 Bulan Penuh (1 s.d. {daysInMonth.length} {MONTH_NAMES[currentMonth.getMonth()]}) •{' '}
            <strong style={{ color: '#0d9488' }}>{monthBookings.length} Peminjaman Terjadwal</strong>
          </div>
        </div>

        {/* Toggle Switcher Mode Tampilan */}
        <div
          style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            onClick={() => setViewMode('matrix')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'matrix' ? '#ffffff' : 'transparent',
              color: viewMode === 'matrix' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'matrix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            📊 Matriks Armada (1 Bulan)
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              background: viewMode === 'calendar' ? '#ffffff' : 'transparent',
              color: viewMode === 'calendar' ? '#0f172a' : '#64748b',
              boxShadow: viewMode === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            🗓️ Kalender Bulanan
          </button>
        </div>
      </div>

      {/* MODE 1: MATRIKS TIMELINE ARMADA 1 BULAN */}
      {viewMode === 'matrix' ? (
        <div
          ref={matrixScrollRef}
          className="table-wrapper"
          style={{
            overflowX: 'auto',
            background: '#ffffff',
            borderRadius: 'var(--radius-xl, 14px)',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <table style={{ minWidth: `${180 + daysInMonth.length * 96}px`, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  style={{
                    width: '180px',
                    position: 'sticky',
                    left: 0,
                    background: '#f8fafc',
                    zIndex: 10,
                    borderRight: '2px solid #cbd5e1',
                    borderBottom: '2px solid #e2e8f0',
                    padding: '0.875rem 1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    color: '#475569',
                    letterSpacing: '0.05em',
                  }}
                >
                  Armada Kendaraan
                </th>
                {daysInMonth.map((d) => {
                  const dayToday = isToday(d)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <th
                      key={d.toISOString()}
                      ref={dayToday ? todayColumnRef : null}
                      style={{
                        textAlign: 'center',
                        padding: '0.625rem 0.35rem',
                        minWidth: '96px',
                        maxWidth: '110px',
                        background: dayToday ? '#ccfbf1' : isWeekend ? '#f8fafc' : '#ffffff',
                        color: dayToday ? '#0f766e' : isWeekend ? '#dc2626' : '#1e293b',
                        borderBottom: '2px solid #e2e8f0',
                        borderRight: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ fontSize: '0.6875rem', fontWeight: 600, opacity: 0.85 }}>
                        {DAY_NAMES[d.getDay()]}
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '1px' }}>
                        {d.getDate()}
                      </div>
                      {dayToday && (
                        <div
                          style={{
                            fontSize: '0.5625rem',
                            fontWeight: 800,
                            background: '#0d9488',
                            color: '#ffffff',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            marginTop: '2px',
                            display: 'inline-block',
                          }}
                        >
                          HARI INI
                        </div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Kolom Sticky Kendaraan */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      background: '#ffffff',
                      zIndex: 9,
                      borderRight: '2px solid #cbd5e1',
                      borderBottom: '1px solid #f1f5f9',
                      padding: '0.875rem 1rem',
                      boxShadow: '2px 0 5px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>
                      🚗 {v.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontFamily: 'monospace',
                        color: '#64748b',
                        marginTop: '2px',
                        fontWeight: 600,
                      }}
                    >
                      {v.plateNumber}
                    </div>
                  </td>

                  {/* Sel per tanggal dalam 1 bulan */}
                  {daysInMonth.map((d) => {
                    const dayBookings = getBookingsForVehicleDay(v.id, d)
                    const dayToday = isToday(d)
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6

                    return (
                      <td
                        key={d.toISOString()}
                        style={{
                          padding: '0.375rem',
                          verticalAlign: 'top',
                          background: dayToday ? 'rgba(204, 251, 241, 0.25)' : isWeekend ? '#fafafa' : '#ffffff',
                          borderRight: '1px solid #f1f5f9',
                          borderBottom: '1px solid #f1f5f9',
                          height: '92px',
                        }}
                      >
                        {dayBookings.map((b) => {
                          const conf = STATUS_CONFIG[b.status] || {
                            label: b.status,
                            color: '#4b5563',
                            bg: '#f3f4f6',
                          }
                          return (
                            <Link
                              key={b.id}
                              href={`/admin/pengajuan/${b.id}`}
                              style={{
                                display: 'block',
                                padding: '0.35rem 0.45rem',
                                marginBottom: '0.3rem',
                                borderRadius: '6px',
                                background: conf.bg,
                                border: `1px solid ${conf.color}40`,
                                color: conf.color,
                                textDecoration: 'none',
                                lineHeight: 1.25,
                                fontSize: '0.675rem',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                transition: 'transform 0.1s ease',
                              }}
                              title={`[${b.bookingCode}] ${b.applicantName} → ${b.destinationName}\nJadwal: ${formatTime(b.departureDatetime)} - ${formatTime(b.returnDatetime)}\nStatus: ${conf.label}`}
                            >
                              <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                👤 {b.applicantName.split(' ')[0]}
                              </div>
                              <div style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                                📍 {b.destinationName.slice(0, 12)}
                              </div>
                              <div style={{ fontSize: '0.6rem', fontWeight: 600, opacity: 0.8, marginTop: '2px' }}>
                                ⏱️ {formatTime(b.departureDatetime)}
                              </div>
                            </Link>
                          )
                        })}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* MODE 2: GRID KALENDER BULANAN (7 Kolom SEN - MIN) */
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl, 14px)',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          {/* Header 7 Hari */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '0.8125rem',
              marginBottom: '8px',
              color: '#475569',
            }}
          >
            {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day, idx) => (
              <div
                key={day}
                style={{
                  padding: '0.5rem',
                  background: idx >= 5 ? '#fef2f2' : '#f8fafc',
                  color: idx >= 5 ? '#dc2626' : '#334155',
                  borderRadius: '6px',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Kotak Tanggal Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {/* Offset awal bulan agar hari jatuh tepat pada kolomnya (Senin = 1, Minggu = 7) */}
            {(() => {
              const firstDayOfWeek = daysInMonth[0].getDay() // 0 = Min, 1 = Sen
              const emptySlots = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1
              return Array.from({ length: emptySlots }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: '110px', background: '#f8fafc', borderRadius: '8px', opacity: 0.4 }} />
              ))
            })()}

            {daysInMonth.map((d) => {
              const dayBookings = getBookingsForDay(d)
              const dayToday = isToday(d)
              const isWeekend = d.getDay() === 0 || d.getDay() === 6

              return (
                <div
                  key={d.toISOString()}
                  style={{
                    minHeight: '110px',
                    padding: '0.5rem',
                    background: dayToday ? '#f0fdfa' : isWeekend ? '#fffafb' : '#ffffff',
                    border: dayToday ? '2px solid #0d9488' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  {/* Angka Tanggal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        color: dayToday ? '#0d9488' : isWeekend ? '#dc2626' : '#1e293b',
                      }}
                    >
                      {d.getDate()}
                    </span>
                    {dayToday && (
                      <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#0d9488' }}>
                        Hari Ini
                      </span>
                    )}
                    {dayBookings.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: '#e2e8f0',
                          borderRadius: '10px',
                          padding: '1px 6px',
                          color: '#334155',
                        }}
                      >
                        {dayBookings.length} armada
                      </span>
                    )}
                  </div>

                  {/* Daftar Booking pada tanggal tersebut */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '2px' }}>
                    {dayBookings.slice(0, 3).map((b) => {
                      const veh = vehicles.find((v) => v.id === b.vehicleId)
                      const conf = STATUS_CONFIG[b.status] || { color: '#334155', bg: '#f1f5f9' }
                      return (
                        <Link
                          key={b.id}
                          href={`/admin/pengajuan/${b.id}`}
                          style={{
                            display: 'block',
                            padding: '0.25rem 0.35rem',
                            borderRadius: '4px',
                            background: conf.bg,
                            border: `1px solid ${conf.color}40`,
                            color: conf.color,
                            fontSize: '0.65rem',
                            lineHeight: 1.2,
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                          title={`[${b.bookingCode}] ${veh?.name || 'Mobil'} - ${b.applicantName} → ${b.destinationName}`}
                        >
                          🚗 <strong>{veh?.name || 'Armada'}</strong>: {b.applicantName.split(' ')[0]} ({b.destinationName.slice(0, 10)})
                        </Link>
                      )
                    })}
                    {dayBookings.length > 3 && (
                      <div style={{ fontSize: '0.625rem', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                        +{dayBookings.length - 3} lainnya...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend Status Peminjaman */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginTop: '1.25rem',
          padding: '0.875rem 1rem',
          background: '#ffffff',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid #e2e8f0',
          fontSize: '0.75rem',
        }}
      >
        <span style={{ fontWeight: 700, color: '#334155' }}>Keterangan Status:</span>
        {Object.entries(STATUS_CONFIG).map(([status, conf]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                background: conf.bg,
                border: `1.5px solid ${conf.color}`,
              }}
            />
            <span style={{ color: '#475569', fontWeight: 500 }}>{conf.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
