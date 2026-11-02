'use client'
// src/components/booking/employee-combobox.tsx
// Dropdown pencarian dan autofill data Guru & Tendik SMKN 1 Subang

import { useState, useEffect, useRef } from 'react'

export type EmployeeOption = {
  id: string
  name: string
  nip: string | null
  phoneWa: string | null
  jabatan: string | null
  unit: string | null
  pangkatGol?: string | null
}

type Props = {
  value: string
  onChange: (name: string) => void
  onSelectEmployee: (emp: EmployeeOption) => void
  placeholder?: string
}

export function EmployeeCombobox({
  value,
  onChange,
  onSelectEmployee,
  placeholder = 'Ketik nama guru atau staf...',
}: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    fetch('/api/employees')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setEmployees(data.employees || [])
        }
      })
      .catch((err) => console.error('Gagal fetch data guru:', err))
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter daftar guru berdasarkan input
  const filteredEmployees = employees.filter((emp) => {
    if (!value) return true
    const q = value.toLowerCase()
    return (
      emp.name.toLowerCase().includes(q) ||
      (emp.nip && emp.nip.includes(q)) ||
      (emp.phoneWa && emp.phoneWa.includes(q))
    )
  })

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        autoComplete="off"
        style={{ width: '100%' }}
      />

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1050,
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            maxHeight: '260px',
            overflowY: 'auto',
            marginTop: '4px',
          }}
        >
          {loading ? (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              Memuat daftar guru...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
              Tidak ditemukan data guru yang cocok. Anda dapat tetap mengetik secara manual.
            </div>
          ) : (
            filteredEmployees.slice(0, 30).map((emp) => (
              <div
                key={emp.id}
                onClick={() => {
                  onChange(emp.name)
                  onSelectEmployee(emp)
                  setIsOpen(false)
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0fdf4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-navy)' }}>
                  {emp.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                  {emp.nip && <span>NIP: {emp.nip}</span>}
                  {emp.phoneWa && <span>WA: {emp.phoneWa}</span>}
                  {emp.pangkatGol && <span>({emp.pangkatGol})</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
