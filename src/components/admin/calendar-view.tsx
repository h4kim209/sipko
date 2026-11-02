'use client'
// src/components/admin/calendar-view.tsx — Kalender Bulanan Admin dengan Warna Mark Penuh (Merah = Dipesan, Oranye = Antrean, Hijau = Tersedia)

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

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Sesuai susunan kalender umum: Minggu sampai Sabtu
const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu Persetujuan', color: '#9a3412', bg: '#ffedd5' },
  DISETUJUI: { label: 'Disetujui', color: '#065f46', bg: '#d1fae5' },
  MENUNGGU_PEMERIKSAAN_AWAL: { label: 'Pemeriksaan Awal', color: '#3730a3', bg: '#e0e7ff' },
  SIAP_BERANGKAT: { label: 'Siap Berangkat', color: '#075985', bg: '#e0f2fe' },
  SEDANG_DIGUNAKAN: { label: 'Sedang Digunakan', color: '#115e59', bg: '#ccfbf1' },
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: { label: 'Pemeriksaan Pengembalian', color: '#9a3412', bg: '#ffedd5' },
  PERLU_PERBAIKAN_BUKTI: { label: 'Perlu Perbaikan Bukti', color: '#991b1b', bg: '#fee2e2' },
  SELESAI: { label: 'Selesai', color: '#374151', bg: '#f3f4f6' },
}

type Props = { vehicles: Vehicle[]; bookings: Booking[] }

export function CalendarView({ vehicles, bookings }: Props) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Filter booking berdasarkan kendaraan jika dipilih
  const filteredBookings = useMemo(() => {
    if (vehicleFilter === 'ALL') return bookings
    return bookings.filter((b) => b.vehicleId === vehicleFilter)
  }, [bookings, vehicleFilter])

  // Menghasilkan sel-sel kalender (termasuk padding bulan sebelum dan sesudah)
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay() // 0 = Minggu
    const lastDate = new Date(year, month + 1, 0).getDate()
    const prevLastDate = new Date(year, month, 0).getDate()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Tanggal bulan sebelumnya
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

    // Tanggal bulan berikutnya hingga genap kelipatan 7
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

  // Booking pada tanggal yang sedang dipilih
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
          border: '1.5px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          padding: '1.25rem',
        }}
      >
        {/* HEADER ATAS: BULAN & NAVIGASI */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
            paddingBottom: '0.875rem',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {/* Judul Bulan & Tahun */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={goToday}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}
            >
              Hari Ini
            </button>
          </div>

          {/* Filter Armada & Tombol Navigasi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
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

            <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
              <button
                onClick={prevMonth}
                title="Bulan sebelumnya"
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRight: '1px solid #cbd5e1',
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer',
                  fontWeight: 800,
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
                  padding: '0.45rem 0.85rem',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  color: '#334155',
                }}
              >
                ▼
              </button>
            </div>
          </div>
        </div>

        {/* LEGENDA WARNA UTAMA SEPERTI FORM PEMOHON */}
        <div
          style={{
            display: 'flex',
            gap: '1.25rem',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            padding: '0.625rem 0.875rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '14px', background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: '4px' }} />
            <span style={{ color: '#166534', fontWeight: 700 }}>Tersedia (Hijau)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '14px', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: '4px' }} />
            <span style={{ color: '#991b1b', fontWeight: 700 }}>Ada Peminjaman / Dipesan (Merah)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '14px', background: '#ffedd5', border: '1.5px solid #fdba74', borderRadius: '4px' }} />
            <span style={{ color: '#9a3412', fontWeight: 700 }}>Antrean Ajuan (Oranye)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '14px', height: '14px', background: '#0d9488', border: '1.5px solid #0f766e', borderRadius: '4px' }} />
            <span style={{ color: '#0f766e', fontWeight: 700 }}>Tanggal Dipilih</span>
          </div>
        </div>

        {/* HEADER NAMA HARI (Min, Sen, Sel, Rab, Kam, Jum, Sab) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '0.8125rem',
            marginBottom: '6px',
          }}
        >
          {DAY_LABELS.map((day, idx) => (
            <div
              key={day}
              style={{
                padding: '0.4rem 0',
                color: idx === 0 ? '#dc2626' : idx === 6 ? '#0d9488' : '#475569',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* KOTAK-KOTAK TANGGAL DENGAN WARNA MARK BESAR & JELAS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
          }}
        >
          {calendarDays.map((item, index) => {
            const dayBookings = getBookingsForDate(item.date)
            const dayToday = isToday(item.date)
            const daySelected = isSelected(item.date)

            // Cek status booking pada hari ini
            const hasApproved = dayBookings.some((b) => b.status !== 'MENUNGGU_PERSETUJUAN')
            const hasPending = dayBookings.some((b) => b.status === 'MENUNGGU_PERSETUJUAN')

            // Tentukan warna latar belakang mark penuh (persis model design pemohon)
            let bg = '#dcfce7' // Default: Hijau Muda (Tersedia)
            let border = '#86efac'
            let textColor = '#166534'
            let badgeBg = 'rgba(22, 101, 52, 0.1)'
            let badgeColor = '#166534'
            let statusLabel = 'Tersedia'

            if (hasApproved) {
              bg = '#fee2e2' // Merah Muda (Ada Peminjaman / Dipesan)
              border = '#fca5a5'
              textColor = '#991b1b'
              badgeBg = '#ef4444'
              badgeColor = '#ffffff'
              statusLabel = `${dayBookings.length} Armada Dipesan`
            } else if (hasPending) {
              bg = '#ffedd5' // Oranye Muda (Antrean Ajuan)
              border = '#fdba74'
              textColor = '#9a3412'
              badgeBg = '#f97316'
              badgeColor = '#ffffff'
              statusLabel = `${dayBookings.length} Antrean`
            }

            // Jika tanggal sedang dipilih (diklik oleh admin)
            if (daySelected) {
              border = '#0d9488'
            }

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
                  background: bg,
                  border: daySelected ? '3px solid #0d9488' : `1.5px solid ${border}`,
                  borderRadius: '10px',
                  minHeight: '75px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: item.isCurrentMonth ? 1 : 0.45,
                  boxShadow: daySelected ? '0 0 0 3px rgba(13, 148, 136, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Baris Angka Tanggal & Indikator Hari Ini */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: textColor,
                      lineHeight: 1,
                    }}
                  >
                    {item.date.getDate()}
                  </span>

                  {dayToday && (
                    <span
                      style={{
                        fontSize: '0.575rem',
                        fontWeight: 800,
                        background: '#0d9488',
                        color: '#ffffff',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      KINI
                    </span>
                  )}
                </div>

                {/* Keterangan Status Besar & Tegas */}
                <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
                  <div
                    style={{
                      fontSize: '0.675rem',
                      fontWeight: 800,
                      background: badgeBg,
                      color: badgeColor,
                      padding: '2px 5px',
                      borderRadius: '5px',
                      textAlign: 'center',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {hasApproved ? `🚗 ${statusLabel}` : hasPending ? `⏳ ${statusLabel}` : `✓ ${statusLabel}`}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DETAIL RINCIAN JADWAL TANGGAL TERPILIH */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1.5px solid #e2e8f0',
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
              📅 {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>
          </div>

          <span
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: 800,
              background: selectedDateBookings.length > 0 ? '#fee2e2' : '#dcfce7',
              color: selectedDateBookings.length > 0 ? '#991b1b' : '#166534',
              border: `1px solid ${selectedDateBookings.length > 0 ? '#fca5a5' : '#86efac'}`,
            }}
          >
            {selectedDateBookings.length > 0
              ? `${selectedDateBookings.length} Armada Terjadwal (Merah)`
              : 'Semua Armada Tersedia (Hijau)'}
          </span>
        </div>

        {selectedDateBookings.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#166534',
              background: '#f0fdf4',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1.5px solid #bbf7d0',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ fontWeight: 800, color: '#166534', fontSize: '1rem' }}>
              Tidak ada jadwal peminjaman pada tanggal ini
            </div>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: '#15803d' }}>
              Seluruh armada kendaraan operasional berstatus <strong>Tersedia (Hijau)</strong> dan siap digunakan.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {selectedDateBookings.map((b) => {
              const veh = vehicles.find((v) => v.id === b.vehicleId)
              const conf = STATUS_LABELS[b.status] || { label: b.status, color: '#334155', bg: '#f1f5f9' }

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
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                          🚗 {veh?.name || 'Kendaraan Dinas'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 700 }}>
                          {veh?.plateNumber} • Kode: <strong>{b.bookingCode}</strong>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          background: conf.bg,
                          color: conf.color,
                          whiteSpace: 'nowrap',
                          border: `1px solid ${conf.color}30`,
                        }}
                      >
                        {conf.label}
                      </span>
                    </div>

                    {/* Informasi Pemohon & Jadwal */}
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        display: 'grid',
                        gap: '0.375rem',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '85px', flexShrink: 0 }}>👤 Pemohon:</span>
                        <strong style={{ color: '#0f172a' }}>{b.applicantName}</strong>
                      </div>
                      {b.driverName && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <span style={{ color: '#64748b', width: '85px', flexShrink: 0 }}>👨‍✈️ Pengemudi:</span>
                          <span style={{ color: '#334155' }}>{b.driverName}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '85px', flexShrink: 0 }}>📍 Tujuan:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{b.destinationName}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', width: '85px', flexShrink: 0 }}>⏱️ Waktu:</span>
                        <span style={{ color: '#0d9488', fontWeight: 800 }}>
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
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
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
    </div>
  )
}
