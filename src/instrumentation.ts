// src/instrumentation.ts
// Hook lifecycle server Next.js — berjalan otomatis 1x saat aplikasi/server baru dijalankan (boot)

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[SIPKO Boot] 🚀 Menjalankan inisialisasi server startup...')
    
    // Inisialisasi otomatis WhatsApp background socket agar langsung standby
    try {
      const { getWhatsAppAdapter } = await import('@/adapters/whatsapp')
      const wa = getWhatsAppAdapter()
      if (wa && typeof (wa as any).initialize === 'function') {
        console.log('[SIPKO Boot] 📱 Memulai koneksi background WhatsApp Bot...')
        ;(wa as any).initialize().catch((err: any) => {
          console.error('[SIPKO Boot] Error inisialisasi WhatsApp saat startup:', err)
        })
      }
    } catch (err) {
      console.error('[SIPKO Boot] Gagal memuat modul WhatsApp:', err)
    }
  }
}
