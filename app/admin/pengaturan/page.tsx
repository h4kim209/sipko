// app/admin/pengaturan/page.tsx — Pengaturan Sistem

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pengaturan' }

export default function PengaturanPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">⚙️ Pengaturan</h1>
        <p className="page-subtitle">Konfigurasi sistem SIPKO.</p>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
        {/* Informasi Sekolah */}
        <div className="card">
          <div className="card-header"><h3>🏫 Informasi Sekolah</h3></div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)' }}>
              <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Nama Instansi</span>
              <span style={{ fontWeight: 600 }}>SMKN 1 Subang</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)' }}>
              <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Alamat</span>
              <span style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>Jl. Arief Rahman Hakim No.40, Subang, Jawa Barat</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-3)' }}>
              <span style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>Domain</span>
              <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>sipko.smkn1subang.sch.id</span>
            </div>
          </div>
        </div>

        {/* Integrasi */}
        <div className="card">
          <div className="card-header"><h3>🔗 Integrasi</h3></div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>📱 WhatsApp (Baileys)</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                  Adapter: {process.env.NODE_ENV === 'production' ? 'Baileys (Produksi)' : 'Dev Console (Development)'}
                </div>
              </div>
              <span className={`badge ${process.env.NODE_ENV === 'production' ? 'status-done' : 'status-pending'}`}>
                {process.env.NODE_ENV === 'production' ? 'Aktif' : 'Mode Dev'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>🗺️ Peta (OpenStreetMap)</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                  Geocoding: Nominatim | Routing: OSRM
                </div>
              </div>
              <span className="badge status-done">Aktif</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3)', background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>🗄️ Database (PostgreSQL)</div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                  ORM: Prisma | Schema: Managed
                </div>
              </div>
              <span className="badge status-done">Terhubung</span>
            </div>
          </div>
        </div>

        {/* Konfigurasi */}
        <div className="card">
          <div className="card-header"><h3>📋 Konfigurasi Sistem</h3></div>
          <div className="card-body" style={{ display: 'grid', gap: 'var(--space-3)' }}>
            <div className="alert alert-info">
              <span>ℹ️</span>
              <div style={{ fontSize: 'var(--font-size-sm)' }}>
                Konfigurasi sistem dikelola melalui file <code>.env.local</code> di server.
                Untuk mengubah pengaturan, hubungi administrator server.
              </div>
            </div>
            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
              {[
                { key: 'Max Upload', value: `${process.env.MAX_FILE_SIZE_MB || 10} MB` },
                { key: 'Timezone', value: 'Asia/Jakarta (WIB)' },
                { key: 'Booking Code Prefix', value: 'SIP-' },
                { key: 'Min. Foto Inspeksi', value: '3 foto' },
              ].map(c => (
                <div key={c.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', borderBottom: '1px solid var(--color-gray-100)', paddingBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-gray-500)' }}>{c.key}</span>
                  <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
