// src/lib/validators/booking.ts
// Zod schemas untuk validasi booking — dipakai di frontend & backend

import { z } from 'zod'

// Normalisasi nomor WhatsApp Indonesia
function normalizeWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits
  return digits
}

const whatsappSchema = z
  .string()
  .min(8)
  .max(16)
  .transform(normalizeWhatsApp)
  .refine((val) => /^62[0-9]{8,13}$/.test(val), {
    message: 'Nomor WhatsApp tidak valid. Gunakan format Indonesia (08xx atau +628xx).',
  })

export const CreateBookingSchema = z
  .object({
    applicantName: z
      .string()
      .min(3, 'Nama lengkap minimal 3 karakter.')
      .max(100),
    applicantNip: z.string().max(30).optional().or(z.literal('')),
    applicantJabatan: z.string().min(2, 'Jabatan wajib diisi.').max(100),
    applicantUnit: z.string().max(100).optional().or(z.literal('')),
    applicantPhoneWa: whatsappSchema,
    vehicleId: z.string().cuid('Kendaraan tidak valid.'),
    purposeCategory: z.string().min(1, 'Kategori keperluan wajib dipilih.'),
    purposeNotes: z.string().max(500).optional().or(z.literal('')),
    destinationName: z
      .string()
      .min(3, 'Nama tujuan wajib diisi.')
      .max(200),
    destinationAddress: z.string().min(5, 'Alamat tujuan wajib diisi.').max(500),
    destinationLat: z.number().optional(),
    destinationLng: z.number().optional(),
    routeDistanceKm: z.number().nonnegative().optional(),
    extraStops: z
      .array(
        z.object({
          name: z.string().min(1),
          address: z.string().min(1),
          lat: z.number().optional(),
          lng: z.number().optional(),
        })
      )
      .max(10)
      .optional(),
    departureDatetime: z
      .string()
      .datetime({ offset: true, message: 'Format tanggal berangkat tidak valid.' }),
    returnDatetime: z
      .string()
      .datetime({ offset: true, message: 'Format tanggal kembali tidak valid.' }),
    additionalNotes: z.string().max(1000).optional().or(z.literal('')),
  })
  .refine(
    (data) => new Date(data.returnDatetime) > new Date(data.departureDatetime),
    {
      message: 'Waktu kembali harus setelah waktu berangkat.',
      path: ['returnDatetime'],
    }
  )
  .refine(
    (data) => new Date(data.departureDatetime) > new Date(),
    {
      message: 'Waktu berangkat harus di masa depan.',
      path: ['departureDatetime'],
    }
  )

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

export const CheckBookingSchema = z.object({
  bookingCode: z
    .string()
    .regex(/^SIP-[A-Z2-9]{8}$/, 'Format kode booking tidak valid.'),
  phoneWa: whatsappSchema,
})

export type CheckBookingInput = z.infer<typeof CheckBookingSchema>
