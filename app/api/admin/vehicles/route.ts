// app/api/admin/vehicles/route.ts
// GET — List all vehicles (admin)
// POST — Create new vehicle (admin)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'APPROVER', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ vehicles })
}

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, brand, type, plateNumber, year, color, fuelType, seatCapacity, currentOdometer, status } = body

    if (!name?.trim() || !brand?.trim() || !plateNumber?.trim()) {
      return NextResponse.json({ error: 'Nama, merek, dan nomor polisi wajib diisi.' }, { status: 400 })
    }

    // Check duplicate plate
    const existing = await prisma.vehicle.findFirst({
      where: { plateNumber: plateNumber.trim().toUpperCase(), deletedAt: null },
    })
    if (existing) {
      return NextResponse.json({ error: 'Nomor polisi sudah terdaftar.' }, { status: 409 })
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        name: name.trim(),
        brand: brand.trim(),
        type: type?.trim() || '',
        plateNumber: plateNumber.trim().toUpperCase(),
        year: year || null,
        color: color?.trim() || null,
        fuelType: fuelType?.trim() || null,
        seatCapacity: seatCapacity || null,
        currentOdometer: currentOdometer || null,
        status: status || 'AVAILABLE',
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.VEHICLE_CREATED,
      entityType: 'vehicle',
      entityId: vehicle.id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      newValue: { name, plateNumber, brand, type },
    })

    return NextResponse.json({ success: true, vehicle }, { status: 201 })
  } catch (err: any) {
    console.error('[Create Vehicle Error]', err)
    return NextResponse.json({ error: 'Gagal membuat kendaraan.' }, { status: 500 })
  }
}
