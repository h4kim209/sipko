// app/admin/layout.tsx — Admin layout wrapper (server component)

import { requireAuth } from '@/lib/auth-guard'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard — SIPKO Admin',
    template: '%s | SIPKO Admin',
  },
  robots: { index: false, follow: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])

  return (
    <div className="admin-layout">
      <AdminSidebar
        userName={session.user?.name || ''}
        userRole={session.user?.role || ''}
      />
      <main className="admin-main">
        <header className="admin-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button className="btn-icon sidebar-toggle" id="sidebar-toggle" aria-label="Toggle menu">
              ☰
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-800)' }}>
                {session.user?.name}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                {session.user?.role === 'ADMIN'
                  ? 'Administrator'
                  : session.user?.role === 'APPROVER'
                  ? 'Pejabat Penyetuju'
                  : 'Super Admin'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <a href="/api/auth/logout" className="btn btn-secondary btn-sm">
              🚪 Keluar
            </a>
          </div>
        </header>
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}
