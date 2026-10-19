// app/admin/audit-log/page.tsx — Audit Log Viewer

import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log' }
export const dynamic = 'force-dynamic'

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const formatDate = (d: Date) =>
    d.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">📜 Audit Log</h1>
        <p className="page-subtitle">Catatan semua aktivitas penting dalam sistem.</p>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aksi</th>
              <th>Aktor</th>
              <th>Role</th>
              <th>Entitas</th>
              <th>Detail</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>{formatDate(log.createdAt)}</td>
                <td>
                  <span className="badge status-pending" style={{ fontSize: '0.65rem' }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{log.actorName || '-'}</td>
                <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>{log.actorRole || '-'}</td>
                <td style={{ fontSize: 'var(--font-size-xs)' }}>{log.entityType || '-'}</td>
                <td style={{ fontSize: 'var(--font-size-xs)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.newValue ? JSON.stringify(log.newValue).slice(0, 80) : '-'}
                </td>
                <td style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--color-gray-400)' }}>{log.ipAddress || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
