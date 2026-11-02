// app/api/vehicles/available/route.ts
// GET — Daftar kendaraan yang tersedia untuk pengajuan

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: { not: 'RETIRED' },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        type: true,
        plateNumber: true,
        seatCapacity: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ vehicles })
  } catch (err: any) {
    console.error('[Vehicles Available Error]', err)
    return NextResponse.json(
      { error: 'Gagal memuat daftar kendaraan.' },
      { status: 500 }
    )
  }
}
