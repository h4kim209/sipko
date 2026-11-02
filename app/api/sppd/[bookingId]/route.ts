// app/api/sppd/[bookingId]/route.ts
// GET — Mengambil dan menampilkan foto surat tugas / SPPD peminjaman kendaraan

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from '@/lib/file-storage'
import { apiAuth } from '@/lib/auth-guard'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params

    if (!bookingId) {
      return NextResponse.json({ error: 'ID booking tidak valid.' }, { status: 400 })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { bookingCode: bookingId.toUpperCase() }],
        deletedAt: null,
      },
      select: {
        id: true,
        bookingCode: true,
        hasSppd: true,
        sppdPhotoPath: true,
        applicantPhoneWa: true,
      },
    })

    if (!booking || !booking.hasSppd || !booking.sppdPhotoPath) {
      return NextResponse.json({ error: 'Dokumen SPPD tidak ditemukan.' }, { status: 404 })
    }

    // Otorisasi: Admin / Approver / Super Admin via session, atau Pemohon via code query
    const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
    if (!session?.user) {
      const code = request.nextUrl.searchParams.get('code')
      if (!code || code.toUpperCase() !== booking.bookingCode) {
        return NextResponse.json({ error: 'Tidak terotorisasi untuk melihat dokumen ini.' }, { status: 403 })
      }
    }

    // Baca file dari storage privat
    const fileBuffer = await readFile(booking.sppdPhotoPath)
    const ext = booking.sppdPhotoPath.toLowerCase()
    const contentType = ext.endsWith('.png')
      ? 'image/png'
      : ext.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=86400',
        'Content-Disposition': `inline; filename="sppd-${booking.bookingCode}.jpg"`,
      },
    })
  } catch (err: any) {
    console.error('[SPPD View Error]', err)
    return NextResponse.json({ error: 'Gagal memuat dokumen SPPD.' }, { status: 500 })
  }
}
