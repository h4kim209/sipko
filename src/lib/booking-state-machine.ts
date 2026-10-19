// src/lib/booking-state-machine.ts
// State machine SIPKO — transisi valid dan role yang berhak

import { BookingStatus, Role } from '@prisma/client'

export type BookingTransition = {
  from: BookingStatus
  to: BookingStatus
  allowedRoles: Role[]
  requiresReason?: boolean
  description: string
}

export const VALID_TRANSITIONS: BookingTransition[] = [
  // Dari MENUNGGU_PERSETUJUAN
  {
    from: 'MENUNGGU_PERSETUJUAN',
    to: 'DISETUJUI',
    allowedRoles: ['APPROVER', 'SUPER_ADMIN'],
    description: 'Kepala Sekolah/Penyetuju menyetujui pengajuan',
  },
  {
    from: 'MENUNGGU_PERSETUJUAN',
    to: 'DITOLAK',
    allowedRoles: ['APPROVER', 'ADMIN', 'SUPER_ADMIN'],
    requiresReason: true,
    description: 'Pengajuan ditolak dengan alasan wajib',
  },
  {
    from: 'MENUNGGU_PERSETUJUAN',
    to: 'DIBATALKAN',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    requiresReason: true,
    description: 'Admin membatalkan pengajuan',
  },

  // Dari DISETUJUI
  {
    from: 'DISETUJUI',
    to: 'MENUNGGU_PEMERIKSAAN_AWAL',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    description: 'Sistem/admin memindahkan ke menunggu pemeriksaan awal',
  },
  {
    from: 'DISETUJUI',
    to: 'SIAP_BERANGKAT',
    allowedRoles: ['PEMOHON', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Pemohon mengunggah bukti pemeriksaan awal',
  },
  {
    from: 'DISETUJUI',
    to: 'DIBATALKAN',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    requiresReason: true,
    description: 'Admin membatalkan booking yang sudah disetujui',
  },

  // Dari MENUNGGU_PEMERIKSAAN_AWAL
  {
    from: 'MENUNGGU_PEMERIKSAAN_AWAL',
    to: 'SIAP_BERANGKAT',
    allowedRoles: ['PEMOHON', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Bukti pemeriksaan awal lengkap dan diverifikasi',
  },

  // Dari SIAP_BERANGKAT
  {
    from: 'SIAP_BERANGKAT',
    to: 'SEDANG_DIGUNAKAN',
    allowedRoles: ['PEMOHON', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Pemohon memulai perjalanan',
  },

  // Dari SEDANG_DIGUNAKAN
  {
    from: 'SEDANG_DIGUNAKAN',
    to: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
    allowedRoles: ['PEMOHON', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Pemohon mengirim bukti akhir dan perjalanan selesai',
  },

  // Dari MENUNGGU_PEMERIKSAAN_PENGEMBALIAN
  {
    from: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
    to: 'PERLU_PERBAIKAN_BUKTI',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    requiresReason: true,
    description: 'Admin meminta perbaikan bukti pengembalian',
  },
  {
    from: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
    to: 'SELESAI',
    allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    description: 'Admin menutup booking setelah pemeriksaan selesai',
  },

  // Dari PERLU_PERBAIKAN_BUKTI
  {
    from: 'PERLU_PERBAIKAN_BUKTI',
    to: 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN',
    allowedRoles: ['PEMOHON', 'ADMIN', 'SUPER_ADMIN'],
    description: 'Pemohon mengupload ulang bukti yang diperbaiki',
  },
]

export function isTransitionAllowed(
  from: BookingStatus,
  to: BookingStatus,
  role: Role
): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  )
}

export function getTransition(
  from: BookingStatus,
  to: BookingStatus
): BookingTransition | undefined {
  return VALID_TRANSITIONS.find((t) => t.from === from && t.to === to)
}

export function getAllowedTransitions(
  from: BookingStatus,
  role: Role
): BookingTransition[] {
  return VALID_TRANSITIONS.filter(
    (t) => t.from === from && t.allowedRoles.includes(role)
  )
}

// Label status dalam Bahasa Indonesia
export const STATUS_LABELS: Record<BookingStatus, string> = {
  MENUNGGU_PERSETUJUAN: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  MENUNGGU_PEMERIKSAAN_AWAL: 'Menunggu Pemeriksaan Awal',
  SIAP_BERANGKAT: 'Siap Berangkat',
  SEDANG_DIGUNAKAN: 'Sedang Digunakan',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'Menunggu Pemeriksaan Pengembalian',
  PERLU_PERBAIKAN_BUKTI: 'Perlu Perbaikan Bukti',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
}

export const STATUS_COLORS: Record<BookingStatus, string> = {
  MENUNGGU_PERSETUJUAN: 'status-pending',
  DISETUJUI: 'status-approved',
  DITOLAK: 'status-rejected',
  MENUNGGU_PEMERIKSAAN_AWAL: 'status-inspection',
  SIAP_BERANGKAT: 'status-ready',
  SEDANG_DIGUNAKAN: 'status-active',
  MENUNGGU_PEMERIKSAAN_PENGEMBALIAN: 'status-return',
  PERLU_PERBAIKAN_BUKTI: 'status-revision',
  SELESAI: 'status-done',
  DIBATALKAN: 'status-cancelled',
}
