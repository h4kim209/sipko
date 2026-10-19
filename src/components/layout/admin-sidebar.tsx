'use client'
// src/components/layout/admin-sidebar.tsx — Sidebar navigasi admin

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
  { section: 'PEMINJAMAN' },
  { label: 'Pengajuan & Persetujuan', href: '/admin/pengajuan', icon: '📝' },
  { label: 'Kalender Kendaraan', href: '/admin/kalender', icon: '📅' },
  { label: 'Pemeriksaan Awal', href: '/admin/pemeriksaan-awal', icon: '🔍' },
  { label: 'Sedang Digunakan', href: '/admin/sedang-digunakan', icon: '🚗' },
  { label: 'Pemeriksaan Pengembalian', href: '/admin/pemeriksaan-kembali', icon: '📋' },
  { section: 'MANAJEMEN' },
  { label: 'Data Kendaraan', href: '/admin/kendaraan', icon: '🚙' },
  { label: 'Riwayat Peminjaman', href: '/admin/riwayat', icon: '📁' },
  { label: 'Laporan & Cetak', href: '/admin/laporan', icon: '🖨️' },
  { section: 'SISTEM' },
  { label: 'WhatsApp Notifikasi', href: '/admin/whatsapp', icon: '📱' },
  { label: 'Manajemen Akun', href: '/admin/akun', icon: '👥' },
  { label: 'Pengaturan', href: '/admin/pengaturan', icon: '⚙️' },
  { label: 'Audit Log', href: '/admin/audit-log', icon: '📜' },
]

type Props = {
  userName: string
  userRole: string
}

export function AdminSidebar({ userName, userRole }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`sidebar${open ? ' open' : ''}`}>
        <Link href="/admin/dashboard" className="sidebar-logo">
          <div className="sidebar-logo-icon">SK</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">SIPKO</span>
            <span className="sidebar-logo-subtitle">SMKN 1 Subang</span>
          </div>
        </Link>

        <nav>
          <ul className="sidebar-nav">
            {MENU_ITEMS.map((item, i) => {
              if ('section' in item) {
                return (
                  <li key={i} className="sidebar-section-title">
                    {item.section}
                  </li>
                )
              }
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              return (
                <li key={item.href} className={`sidebar-nav-item${isActive ? ' active' : ''}`}>
                  <Link href={item.href!} onClick={() => setOpen(false)}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
            SIPKO v1.0
          </div>
        </div>
      </aside>

      {/* Mobile toggle — attach via script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('click', function(e) {
              if (e.target.closest('#sidebar-toggle')) {
                document.querySelector('.sidebar').classList.toggle('open');
              }
            });
          `,
        }}
      />
    </>
  )
}
