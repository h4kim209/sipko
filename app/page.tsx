// app/page.tsx — Halaman Beranda SIPKO (Publik)

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beranda — SIPKO',
  description:
    'Ajukan peminjaman kendaraan operasional SMKN 1 Subang secara digital. Cepat, mudah, dan dapat dilacak.',
}

const STEPS = [
  {
    number: '1',
    icon: '📝',
    title: 'Buat Pengajuan',
    desc: 'Isi formulir peminjaman kendaraan dengan detail perjalanan dan keperluan dinas.',
  },
  {
    number: '2',
    icon: '✅',
    title: 'Tunggu Persetujuan',
    desc: 'Kepala Sekolah atau pejabat berwenang akan meninjau dan menyetujui pengajuan Anda.',
  },
  {
    number: '3',
    icon: '🔍',
    title: 'Periksa Kendaraan',
    desc: 'Setelah disetujui, lengkapi bukti pemeriksaan kendaraan sebelum berangkat.',
  },
  {
    number: '4',
    icon: '🚗',
    title: 'Gunakan Kendaraan',
    desc: 'Mulai perjalanan dan kembali tepat waktu sesuai jadwal yang disetujui.',
  },
  {
    number: '5',
    icon: '📸',
    title: 'Bukti Pengembalian',
    desc: 'Unggah foto kondisi kendaraan dan odometer akhir saat mengembalikan.',
  },
  {
    number: '6',
    icon: '🏁',
    title: 'Pemeriksaan Akhir',
    desc: 'Admin memeriksa bukti pengembalian dan menutup booking.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Navbar */}
      <nav className="public-nav">
        <div className="public-nav-inner">
          <Link href="/" className="public-nav-logo">
            <div className="nav-logo-icon">SK</div>
            <div>
              <div className="nav-logo-title">SIPKO</div>
              <div className="nav-logo-subtitle">SMKN 1 Subang</div>
            </div>
          </Link>
          <div className="public-nav-links">
            <a href="/panduan.html" target="_blank" className="btn btn-secondary btn-sm">
              📖 Panduan
            </a>
            <Link href="/cek-booking" className="btn btn-secondary btn-sm">
              🔍 Cek Booking
            </Link>
            <Link href="/login" className="btn btn-navy btn-sm">
              🔐 Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="public-container">
          <div className="hero-content">
            <div className="hero-badge">
              🏫 SMKN 1 Subang — Sistem Digital
            </div>
            <h1 className="hero-title">
              <span>SIPKO</span>
              <br />
              Sistem Peminjaman
              <br />
              Kendaraan Operasional
            </h1>
            <p className="hero-desc">
              Kelola peminjaman kendaraan operasional sekolah secara digital.
              Pengajuan, persetujuan, pemeriksaan, dan laporan — semua dalam
              satu sistem yang transparan dan akuntabel.
            </p>
            <div className="hero-actions">
              <Link href="/pengajuan" className="btn btn-white btn-lg">
                📝 Buat Pengajuan
              </Link>
              <Link href="/cek-booking" className="btn btn-outline-white btn-lg">
                🔍 Cek Kode Booking
              </Link>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { val: '100%', label: 'Digital & Paperless' },
                { val: 'Real-time', label: 'Notifikasi WhatsApp' },
                { val: 'Aman', label: 'Data Terenkripsi' },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary-300)' }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cara Kerja */}
      <section style={{ background: 'var(--color-white)', padding: '4rem 0' }}>
        <div className="public-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: '0.75rem' }}>
              Cara Kerja SIPKO
            </h2>
            <p style={{ color: 'var(--color-gray-500)', maxWidth: '480px', margin: '0 auto' }}>
              Proses peminjaman kendaraan yang sederhana, terstruktur, dan dapat dilacak dari awal hingga selesai.
            </p>
          </div>
          <div className="process-steps">
            {STEPS.map((step) => (
              <div key={step.number} className="step-card">
                <div className="step-number">{step.number}</div>
                <span className="step-icon">{step.icon}</span>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-navy-50))',
        padding: '4rem 0',
        borderTop: '1px solid var(--color-gray-200)',
      }}>
        <div className="public-container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '1rem' }}>
            Siap Mengajukan Peminjaman?
          </h2>
          <p style={{ color: 'var(--color-gray-500)', marginBottom: '2rem' }}>
            Isi formulir digital — tidak perlu antri atau mengurus kertas.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/pengajuan" className="btn btn-primary btn-lg">
              📝 Buat Pengajuan Sekarang
            </Link>
            <Link href="/cek-booking" className="btn btn-secondary btn-lg">
              🔍 Cek Status Booking
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: 'var(--color-navy)',
        color: 'rgba(255,255,255,0.6)',
        padding: '2rem 0',
        textAlign: 'center',
      }}>
        <div className="public-container">
          <div style={{ marginBottom: '0.5rem', color: 'white', fontWeight: 700 }}>
            SIPKO — Sistem Peminjaman Kendaraan Operasional
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            SMKN 1 Subang | Jl. Arief Rahman Hakim No.35, Subang, Jawa Barat
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <a href="/panduan.html" target="_blank" style={{ color: 'var(--color-primary-400)', fontSize: '0.8rem', textDecoration: 'underline' }}>
              📖 Buka Panduan Penggunaan Interaktif SIPKO
            </a>
          </div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            © {new Date().getFullYear()} SMKN 1 Subang. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  )
}
