'use client'
// src/components/admin/vehicle-odometer-chart.tsx — Komponen Grafik Riwayat KM & Pemakaian Kendaraan

import { useState } from 'react'

export type UsagePoint = {
  bookingId: string
  bookingCode: string
  applicantName: string
  destinationName: string
  completedAt: string
  startKm: number
  endKm: number
  tripDistance: number
}

export type VehicleOdoData = {
  id: string
  name: string
  brand: string | null
  type: string | null
  plateNumber: string
  currentOdometer: number
  status: string
  totalUsageKm: number
  tripCount: number
  history: UsagePoint[]
}

interface Props {
  vehicles: VehicleOdoData[]
}

const VEHICLE_COLORS = [
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', text: '#059669' }, // Emerald
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', text: '#2563eb' }, // Blue
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', text: '#d97706' }, // Amber
  { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.15)', text: '#7c3aed' }, // Purple
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.15)', text: '#db2777' }, // Pink
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)', text: '#0891b2' },  // Cyan
]

export function VehicleOdometerChart({ vehicles }: Props) {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    vehicles[0]?.id || ''
  )
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number
    y: number
    title: string
    km: number
    trip: number
    applicant: string
    dest: string
  } | null>(null)

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0]

  if (!vehicles.length) {
    return (
      <div className="card">
        <div className="card-body">
          <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
            Belum ada data kendaraan terdaftar.
          </p>
        </div>
      </div>
    )
  }

  // Siapkan data titik untuk grafik garis kumulatif
  // Titik awal: titik 0 sebelum pemakaian pertama
  const rawPoints = activeVehicle ? activeVehicle.history : []
  
  // Format titik-titik KM:
  // Mulai dari titik awal jika ada riwayat, lalu setiap perjalanan menambahkan endKm
  const dataSeries: {
    label: string
    km: number
    trip: number
    applicant: string
    dest: string
    date: string
  }[] = []

  if (rawPoints.length > 0) {
    // Titik awal sebelum pemakaian pertama
    dataSeries.push({
      label: 'Awal',
      km: rawPoints[0].startKm,
      trip: 0,
      applicant: '-',
      dest: 'KM Awal Tercatat',
      date: '-',
    })
    rawPoints.forEach((p, idx) => {
      dataSeries.push({
        label: p.bookingCode,
        km: p.endKm,
        trip: p.tripDistance,
        applicant: p.applicantName,
        dest: p.destinationName,
        date: new Date(p.completedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        }),
      })
    })
  } else {
    // Jika belum ada perjalanan yang SELESAI, tampilkan 1 titik KM saat ini
    dataSeries.push({
      label: 'Saat Ini',
      km: activeVehicle.currentOdometer,
      trip: 0,
      applicant: '-',
      dest: 'Belum ada pemakaian selesai',
      date: 'Sekarang',
    })
  }

  // Hitung skala SVG
  const minKm = Math.min(...dataSeries.map((d) => d.km))
  const maxKm = Math.max(...dataSeries.map((d) => d.km))
  const rangeKm = maxKm === minKm ? Math.max(minKm * 0.1, 50) : maxKm - minKm
  const paddedMin = Math.max(0, Math.floor(minKm - rangeKm * 0.1))
  const paddedMax = Math.ceil(maxKm + rangeKm * 0.1)

  const width = 680
  const height = 240
  const padLeft = 65
  const padRight = 30
  const padTop = 30
  const padBottom = 45

  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const getX = (index: number) => {
    if (dataSeries.length <= 1) return padLeft + chartW / 2
    return padLeft + (index / (dataSeries.length - 1)) * chartW
  }

  const getY = (val: number) => {
    if (paddedMax === paddedMin) return padTop + chartH / 2
    const ratio = (val - paddedMin) / (paddedMax - paddedMin)
    return padTop + chartH - ratio * chartH
  }

  // Buat path SVG untuk garis dan area
  const pointsString = dataSeries.map((d, i) => `${getX(i)},${getY(d.km)}`).join(' ')
  const areaPath =
    dataSeries.length > 1
      ? `M ${getX(0)},${getY(dataSeries[0].km)} ` +
        dataSeries
          .slice(1)
          .map((d, i) => `L ${getX(i + 1)},${getY(d.km)}`)
          .join(' ') +
        ` L ${getX(dataSeries.length - 1)},${padTop + chartH} L ${getX(0)},${
          padTop + chartH
        } Z`
      : ''

  // Grid baris horizontal Y
  const yTicksCount = 4
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
    const val = Math.round(paddedMin + (i / yTicksCount) * (paddedMax - paddedMin))
    return { val, y: getY(val) }
  })

  // Bar chart perbandingan total KM seluruh mobil
  const maxTotalKm = Math.max(...vehicles.map((v) => v.currentOdometer), 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* 1. Header & Selector Pilihan Mobil */}
      <div className="card">
        <div
          className="card-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📈 Grafik Pertambahan KM & Pemakaian Kendaraan
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
              Riwayat odometer bertambah secara otomatis setiap pemohon selesai menggunakan mobil dan bukti disetujui.
            </p>
          </div>

          {/* Selector Kendaraan */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-600)' }}>
              Pilih Mobil:
            </span>
            <select
              className="form-select"
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value)
                setActiveTooltip(null)
              }}
              style={{
                fontSize: '0.85rem',
                padding: '0.4rem 2rem 0.4rem 0.75rem',
                fontWeight: 600,
                color: 'var(--color-primary-800)',
              }}
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.plateNumber}) — {v.currentOdometer.toLocaleString('id-ID')} km
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Ringkasan Mobil yang Dipilih */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            <div
              style={{
                background: 'var(--color-gray-50)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-gray-200)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>
                KENDARAAN DIPILIH
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-gray-900)', marginTop: '4px' }}>
                {activeVehicle.name}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                {activeVehicle.plateNumber}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                ODOMETER SAAT INI
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46', marginTop: '4px' }}>
                {activeVehicle.currentOdometer.toLocaleString('id-ID')}{' '}
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>km</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '2px' }}>
                {rawPoints.length > 0 ? `+${activeVehicle.totalUsageKm.toLocaleString('id-ID')} km dari riwayat pemakaian` : 'Belum ada kenaikan'}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(59, 130, 246, 0.08)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>
                TOTAL PERJALANAN SELESAI
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginTop: '4px' }}>
                {activeVehicle.tripCount}{' '}
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>kali</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: '2px' }}>
                Pemeriksaan pengembalian tervalidasi
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-gray-50)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-gray-200)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>
                STATUS KENDARAAN
              </div>
              <div style={{ marginTop: '8px' }}>
                <span
                  className={`badge ${
                    activeVehicle.status === 'AVAILABLE'
                      ? 'status-done'
                      : activeVehicle.status === 'IN_USE'
                      ? 'status-active'
                      : 'status-revision'
                  }`}
                  style={{ fontSize: '0.8rem' }}
                >
                  ● {activeVehicle.status === 'AVAILABLE' ? 'Tersedia' : activeVehicle.status === 'IN_USE' ? 'Sedang Digunakan' : activeVehicle.status}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Visualisasi Grafik Garis Pertambahan KM */}
          <div
            style={{
              position: 'relative',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-gray-200)',
              padding: '1rem 0.5rem 0.5rem',
              overflowX: 'auto',
            }}
          >
            <div style={{ padding: '0 1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gray-800)' }}>
                📊 Garis Tren Kenaikan Odometer (KM Kumulatif)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                Arahkan kursor pada titik untuk melihat detail pemohon & jarak perjalanan
              </span>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', height: 'auto', minWidth: '550px', display: 'block' }}
            >
              <defs>
                <linearGradient id="kmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Garis Grid Horizontal */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={tick.y}
                    x2={width - padRight}
                    y2={tick.y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? 'none' : '3 3'}
                  />
                  <text
                    x={padLeft - 8}
                    y={tick.y + 4}
                    fontSize="10"
                    fill="#94a3b8"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tick.val.toLocaleString('id-ID')}
                  </text>
                </g>
              ))}

              {/* Area gradien */}
              {areaPath && <path d={areaPath} fill="url(#kmGradient)" />}

              {/* Garis kurva utama */}
              {dataSeries.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />
              )}

              {/* Titik-titik interaktif */}
              {dataSeries.map((d, i) => {
                const cx = getX(i)
                const cy = getY(d.km)
                const isFirst = i === 0 && rawPoints.length > 0
                return (
                  <g
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setActiveTooltip({
                        x: cx,
                        y: cy,
                        title: d.label,
                        km: d.km,
                        trip: d.trip,
                        applicant: d.applicant,
                        dest: d.dest,
                      })
                    }}
                    onMouseLeave={() => setActiveTooltip(null)}
                  >
                    {/* Circle halo */}
                    <circle cx={cx} cy={cy} r="8" fill="rgba(16, 185, 129, 0.2)" />
                    {/* Main Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r="4.5"
                      fill={isFirst ? '#64748b' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Label teks di bawah titik */}
                    <text
                      x={cx}
                      y={padTop + chartH + 18}
                      fontSize="9.5"
                      fill="#64748b"
                      textAnchor="middle"
                      fontWeight="500"
                    >
                      {d.label}
                    </text>
                    {d.date !== '-' && (
                      <text
                        x={cx}
                        y={padTop + chartH + 30}
                        fontSize="8.5"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        {d.date}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Tooltip Hover Interaktif */}
            {activeTooltip && (
              <div
                style={{
                  position: 'absolute',
                  left: `${(activeTooltip.x / width) * 100}%`,
                  top: `${activeTooltip.y - 12}px`,
                  transform: 'translate(-50%, -100%)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  color: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
                  zIndex: 10,
                }}
              >
                <div style={{ fontWeight: 700, color: '#34d399', marginBottom: '2px' }}>
                  {activeTooltip.title}
                </div>
                <div>
                  KM Akhir:{' '}
                  <strong>{activeTooltip.km.toLocaleString('id-ID')} km</strong>
                </div>
                {activeTooltip.trip > 0 && (
                  <div style={{ color: '#60a5fa' }}>
                    Jarak Ditempuh: +{activeTooltip.trip.toLocaleString('id-ID')} km
                  </div>
                )}
                {activeTooltip.applicant !== '-' && (
                  <div>Pemohon: {activeTooltip.applicant}</div>
                )}
                <div style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>
                  Tujuan: {activeTooltip.dest}
                </div>
              </div>
            )}
          </div>

          {/* 3. Tabel Detail Riwayat Pertambahan KM Mobil Ini */}
          <div>
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--color-gray-800)' }}>
              📑 Log Rincian Pemakaian & Kenaikan Odometer
            </h4>

            {rawPoints.length === 0 ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--color-gray-50)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--color-gray-500)',
                  fontSize: '0.85rem',
                }}
              >
                Kendaraan ini belum memiliki riwayat pemakaian berstatus <strong>SELESAI</strong>. Begitu pemohon selesai mengunggah pemeriksaan pengembalian dan disetujui, log kenaikan KM akan tercatat otomatis di sini.
              </div>
            ) : (
              <div className="table-wrapper" style={{ boxShadow: 'none', border: '1px solid var(--color-gray-200)' }}>
                <table>
                  <thead>
                    <tr>
                      <th>KODE</th>
                      <th>PEMOHON</th>
                      <th>TUJUAN</th>
                      <th>KM AWAL (BERANGKAT)</th>
                      <th>KM AKHIR (KEMBALI)</th>
                      <th>JARAK TEMPUH</th>
                      <th>TANGGAL SELESAI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawPoints.map((p, idx) => (
                      <tr key={p.bookingId}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-primary-700)' }}>
                          {p.bookingCode}
                        </td>
                        <td style={{ fontWeight: 500 }}>{p.applicantName}</td>
                        <td style={{ fontSize: '0.85rem' }}>{p.destinationName}</td>
                        <td style={{ fontFamily: 'monospace' }}>
                          {p.startKm.toLocaleString('id-ID')} km
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {p.endKm.toLocaleString('id-ID')} km
                        </td>
                        <td>
                          <span
                            className="badge status-done"
                            style={{ fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            +{p.tripDistance.toLocaleString('id-ID')} km
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                          {new Date(p.completedAt).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Perbandingan Total Odometer Seluruh Armada Mobil */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ margin: 0 }}>📊 Perbandingan Total KM Seluruh Armada Mobil</h3>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {vehicles.map((v, i) => {
            const pct = Math.min(100, Math.round((v.currentOdometer / maxTotalKm) * 100))
            const color = VEHICLE_COLORS[i % VEHICLE_COLORS.length]

            return (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-lg)',
                  background: selectedVehicleId === v.id ? 'var(--color-gray-50)' : 'transparent',
                  cursor: 'pointer',
                  border: selectedVehicleId === v.id ? '1px solid var(--color-primary-300)' : '1px solid transparent',
                }}
                onClick={() => setSelectedVehicleId(v.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-gray-900)' }}>
                      {v.name}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                      ({v.plateNumber})
                    </span>
                    {v.id === selectedVehicleId && (
                      <span className="badge status-approved" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                        Sedang Dilihat
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: 'monospace', color: color.text, fontSize: '0.95rem' }}>
                    {v.currentOdometer.toLocaleString('id-ID')} km
                  </div>
                </div>

                {/* Progress bar visual */}
                <div
                  style={{
                    width: '100%',
                    height: '10px',
                    background: 'var(--color-gray-100)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: color.stroke,
                      borderRadius: '999px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-gray-400)' }}>
                  <span>{v.tripCount} perjalanan tervalidasi (+{v.totalUsageKm.toLocaleString('id-ID')} km)</span>
                  <span>{pct}% dari armada tertinggi</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
