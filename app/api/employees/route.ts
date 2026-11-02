// app/api/employees/route.ts
// GET — Daftar master pegawai (guru/tendik) untuk autocomplete formulir publik

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('q') || ''

    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(search.trim()
          ? {
              OR: [
                { name: { contains: search.trim() } },
                { nip: { contains: search.trim() } },
                { phoneWa: { contains: search.trim() } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        nip: true,
        phoneWa: true,
        jabatan: true,
        unit: true,
        pangkatGol: true,
      },
      orderBy: { name: 'asc' },
      take: 200,
    })

    return NextResponse.json({ employees })
  } catch (err: any) {
    console.error('[Employees Search Error]', err)
    return NextResponse.json({ error: 'Gagal memuat data pegawai' }, { status: 500 })
  }
}
