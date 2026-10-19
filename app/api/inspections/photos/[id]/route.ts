// app/api/inspections/photos/[id]/route.ts
// GET — Mengambil dan menampilkan foto pemeriksaan kendaraan (Speedometer, Kondisi, BBM)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from '@/lib/file-storage'
import { apiAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID foto tidak valid.' }, { status: 400 })
    }

    // Cari metadata foto di database
    const photo = await prisma.inspectionPhoto.findUnique({
      where: { id },
      include: {
        inspection: {
          select: {
            booking: {
              select: {
                id: true,
                bookingCode: true,
                applicantPhoneWa: true,
              },
            },
          },
        },
      },
    })

    if (!photo) {
      return NextResponse.json({ error: 'Foto tidak ditemukan.' }, { status: 404 })
    }

    // Cek otorisasi:
    // 1. Admin / Approver / Super Admin via session NextAuth
    // 2. Pemohon via query param code & phone (opsional untuk akses cek-booking)
    const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
    if (!session?.user) {
      const searchParams = request.nextUrl.searchParams
      const code = searchParams.get('code')
      const phone = searchParams.get('phone')

      const isAuthorizedApplicant =
        code &&
        phone &&
        photo.inspection.booking.bookingCode.toUpperCase() === code.toUpperCase() &&
        photo.inspection.booking.applicantPhoneWa.includes(phone.replace(/\D/g, '').slice(-8))

      if (!isAuthorizedApplicant) {
        return NextResponse.json({ error: 'Tidak terotorisasi untuk melihat foto ini.' }, { status: 401 })
      }
    }

    // Baca file dari storage
    const fileBuffer = await readFile(photo.filePath)

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': photo.mimeType || 'image/jpeg',
        'Content-Length': photo.fileSize.toString(),
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': 'inline',
      },
    })
  } catch (err: any) {
    console.error('[Get Inspection Photo Error]', err)
    return NextResponse.json({ error: 'Gagal memuat foto.' }, { status: 500 })
  }
}
