// app/layout.tsx — Root layout SIPKO

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SIPKO — Sistem Peminjaman Kendaraan Operasional',
    template: '%s | SIPKO SMKN 1 Subang',
  },
  description:
    'SIPKO adalah sistem digital untuk mengelola peminjaman kendaraan operasional SMKN 1 Subang secara efisien, transparan, dan akuntabel.',
  keywords: ['SIPKO', 'peminjaman kendaraan', 'SMKN 1 Subang', 'operasional', 'sekolah'],
  authors: [{ name: 'SMKN 1 Subang' }],
  openGraph: {
    title: 'SIPKO — Sistem Peminjaman Kendaraan Operasional',
    description: 'Sistem manajemen peminjaman kendaraan operasional SMKN 1 Subang',
    locale: 'id_ID',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0d9488" />
      </head>
      <body>{children}</body>
    </html>
  )
}
