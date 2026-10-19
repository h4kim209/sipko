// src/adapters/whatsapp/index.ts
// Factory — pilih adapter berdasarkan konfigurasi

import type { WhatsAppAdapter } from './types'
import { DevWhatsAppAdapter } from './dev-adapter'
import { getBaileysAdapter } from './baileys-adapter'

const globalForWa = globalThis as unknown as {
  __waAdapter?: WhatsAppAdapter | null
}

export function getWhatsAppAdapter(): WhatsAppAdapter {
  if (globalForWa.__waAdapter) return globalForWa.__waAdapter

  const sessionDir = process.env.WA_SESSION_DIR
  const isDev = process.env.NODE_ENV === 'development'

  if (!sessionDir) {
    console.warn('[WhatsApp] WA_SESSION_DIR tidak diset. Menggunakan DevAdapter (log only).')
    globalForWa.__waAdapter = new DevWhatsAppAdapter()
    return globalForWa.__waAdapter
  }

  if (isDev && process.env.WA_FORCE_DEV === 'true') {
    console.warn('[WhatsApp] WA_FORCE_DEV=true. Menggunakan DevAdapter.')
    globalForWa.__waAdapter = new DevWhatsAppAdapter()
    return globalForWa.__waAdapter
  }

  globalForWa.__waAdapter = getBaileysAdapter()
  return globalForWa.__waAdapter
}

// Template pesan WhatsApp dalam Bahasa Indonesia formal
export const WA_TEMPLATES = {
  bookingCreatedApplicant: (data: {
    nama: string
    waktu_pinjam: string
    waktu_kembali: string
    tujuan: string
    jarak_km: string
    kode_booking: string
    app_url: string
  }) => `SIPKO — Sistem Peminjaman Kendaraan Operasional
Assalamu'alaikum Bapak/Ibu ${data.nama}.

Pengajuan peminjaman kendaraan operasional berhasil dikirim.

📅 Berangkat: ${data.waktu_pinjam}
📅 Kembali: ${data.waktu_kembali}
📍 Tujuan: ${data.tujuan}
🛣️ Estimasi Jarak: ${data.jarak_km} km
🔖 Kode Booking: ${data.kode_booking}

Status: Menunggu Persetujuan.
Silakan cek status melalui ${data.app_url}

SIPKO | SMKN 1 Subang`,

  bookingCreatedAdmin: (data: {
    nama_pemohon: string
    nip: string
    jabatan: string
    waktu_pinjam: string
    waktu_kembali: string
    tujuan: string
    kode_booking: string
    app_url: string
  }) => `SIPKO — Pengajuan Peminjaman Baru

👤 Pemohon: ${data.nama_pemohon}
🪪 NIP: ${data.nip || '-'}
💼 Jabatan: ${data.jabatan}
📅 Berangkat: ${data.waktu_pinjam}
📅 Kembali: ${data.waktu_kembali}
📍 Tujuan: ${data.tujuan}
🔖 Kode Booking: ${data.kode_booking}

Silakan periksa dashboard: ${data.app_url}`,

  bookingApproved: (data: {
    nama: string
    waktu_pinjam: string
    waktu_kembali: string
    tujuan: string
    kode_booking: string
    app_url: string
  }) => `SIPKO — Peminjaman Disetujui ✅

Bapak/Ibu ${data.nama}, pengajuan Anda telah disetujui.

📅 Berangkat: ${data.waktu_pinjam}
📅 Kembali: ${data.waktu_kembali}
📍 Tujuan: ${data.tujuan}
🔖 Kode Booking: ${data.kode_booking}

Sebelum berangkat, buka Cek Kode Booking dan lengkapi bukti kilometer awal serta kondisi kendaraan.

${data.app_url}

Selamat bertugas dan hati-hati di perjalanan 🙏
SIPKO | SMKN 1 Subang`,

  bookingRejected: (data: {
    nama: string
    kode_booking: string
    waktu_pinjam: string
    tujuan: string
    alasan_penolakan: string
  }) => `SIPKO — Pengajuan Belum Disetujui ❌

Bapak/Ibu ${data.nama}, pengajuan ${data.kode_booking} belum dapat disetujui.

📅 Jadwal: ${data.waktu_pinjam}
📍 Tujuan: ${data.tujuan}
📝 Alasan: ${data.alasan_penolakan}

Terima kasih.
SIPKO | SMKN 1 Subang`,

  returnEvidenceReceived: (data: {
    nama: string
    kode_booking: string
    tujuan: string
    km_awal: string
    km_akhir: string
    km_aktual: string
    app_url: string
  }) => `SIPKO — Pemeriksaan Pengembalian 📋

👤 Pemohon: ${data.nama}
🔖 Kode Booking: ${data.kode_booking}
📍 Tujuan: ${data.tujuan}
🔢 KM Awal: ${data.km_awal}
🔢 KM Akhir: ${data.km_akhir}
📏 Jarak Aktual: ${data.km_aktual} km

Bukti tersedia di dashboard untuk diperiksa.
${data.app_url}

Status: Menunggu Pemeriksaan Pengembalian.`,

  bookingCompleted: (data: {
    nama: string
    kode_booking: string
    tujuan: string
    app_url?: string
  }) => `SIPKO — Peminjaman Selesai ✅

Bapak/Ibu ${data.nama},
Peminjaman kendaraan dengan kode ${data.kode_booking} telah selesai dan tercatat.

📍 Tujuan: ${data.tujuan}

Terima kasih telah menggunakan SIPKO.
SIPKO | SMKN 1 Subang`,

  revisionNeeded: (data: {
    nama: string
    kode_booking: string
    catatan: string
    app_url: string
  }) => `SIPKO — Perbaikan Bukti Diperlukan 🔁

Bapak/Ibu ${data.nama},
Bukti pengembalian untuk kode booking ${data.kode_booking} perlu diperbaiki.

📝 Catatan petugas: ${data.catatan}

Silakan unggah ulang bukti melalui menu Cek Kode Booking:
${data.app_url}

SIPKO | SMKN 1 Subang`,

  overdueWarning: (data: {
    nama: string
    kode_booking: string
    waktu_kembali: string
    tujuan: string
    app_url: string
  }) => `SIPKO — ⚠️ Peringatan Keterlambatan

Bapak/Ibu ${data.nama},
Kendaraan dengan kode booking ${data.kode_booking} telah melewati jadwal kembali.

📅 Jadwal Kembali: ${data.waktu_kembali}
📍 Tujuan: ${data.tujuan}

Mohon segera kembali dan unggah bukti pengembalian melalui:
${data.app_url}

SIPKO | SMKN 1 Subang`,
}
