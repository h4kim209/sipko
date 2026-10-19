'use client'
// src/components/admin/calendar-view.tsx — Timeline calendar untuk jadwal kendaraan

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Vehicle = { id: string; name: string; plateNumber: string }
type Booking = {
  id: string
  bookingCode: string
  vehicleId: string
  applicantName: string
  destinationName: string
  departureDatetime: string
  returnDatetime: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  MENUNGGU_PERSETUJUAN: '#f59e0b',
  DISETUJUI: '#10b981',
  MENUNGGU_PEMERIKSAAN_AWAL: '#6366f1',
  SIAP_BERANGKAT: '#0ea5e9',
  SEDANG_DIGUNAKAN: '#0d9488',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: '#f97316',
  PERLU_PERBAIKAN_BUKTI: '#ef4444',
  SELESAI: '#6b7280',
}

type Props = { vehicles: Vehicle[]; bookings: Booking[] }

export function CalendarView({ vehicles, bookings }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)

  const startOfWeek = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + weekOffset * 7) // Monday
    d.setHours(0, 0, 0, 0)
    return d
  }, [weekOffset])

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [startOfWeek])

  const endOfWeek = new Date(days[6])
  endOfWeek.setHours(23, 59, 59, 999)

  const formatDay = (d: Date) =>
    d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

  const isToday = (d: Date) => {
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  const getBookingsForVehicleDay = (vehicleId: string, day: Date) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    return bookings.filter(b =>
      b.vehicleId === vehicleId &&
      new Date(b.departureDatetime) <= dayEnd &&
      new Date(b.returnDatetime) >= dayStart
    )
  }

  return (
    <div>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w - 1)}>
          ← Minggu Sebelumnya
        </button>
        <div style={{ fontWeight: 700, color: 'var(--color-gray-700)' }}>
          {days[0].toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' — '}
          {days[6].toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}>Hari Ini</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(w => w + 1)}>
            Minggu Berikutnya →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px', position: 'sticky', left: 0, background: 'var(--color-gray-50)', zIndex: 2 }}>
                Kendaraan
              </th>
              {days.map(d => (
                <th
                  key={d.toISOString()}
                  style={{
                    textAlign: 'center',
                    background: isToday(d) ? 'var(--color-primary-50)' : undefined,
                    color: isToday(d) ? 'var(--color-primary-700)' : undefined,
                    fontWeight: isToday(d) ? 800 : undefined,
                    minWidth: '120px',
                  }}
                >
                  {formatDay(d)}
                  {isToday(d) && <div style={{ fontSize: '0.6rem', color: 'var(--color-primary-500)' }}>HARI INI</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id}>
                <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 1, borderRight: '2px solid var(--color-gray-200)' }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{v.name}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--color-gray-400)' }}>{v.plateNumber}</div>
                </td>
                {days.map(d => {
                  const dayBookings = getBookingsForVehicleDay(v.id, d)
                  return (
                    <td
                      key={d.toISOString()}
                      style={{
                        padding: '0.375rem',
                        verticalAlign: 'top',
                        background: isToday(d) ? 'var(--color-primary-50)' : undefined,
                      }}
                    >
                      {dayBookings.map(b => (
                        <Link
                          key={b.id}
                          href={`/admin/pengajuan/${b.id}`}
                          style={{
                            display: 'block',
                            padding: '0.25rem 0.5rem',
                            marginBottom: '0.25rem',
                            borderRadius: 'var(--radius-sm)',
                            background: STATUS_COLORS[b.status] || '#9ca3af',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            lineHeight: 1.3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={`${b.bookingCode} — ${b.applicantName} → ${b.destinationName}`}
                        >
                          {b.applicantName.split(' ')[0]}
                          <br />
                          <span style={{ opacity: 0.8 }}>{b.destinationName.slice(0, 15)}</span>
                        </Link>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: color }} />
            <span style={{ color: 'var(--color-gray-500)' }}>{status.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
