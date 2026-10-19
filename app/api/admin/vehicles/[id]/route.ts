// app/api/admin/vehicles/[id]/route.ts
// PUT — Update vehicle
// DELETE — Soft-delete vehicle

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, brand, type, plateNumber, year, color, fuelType, seatCapacity, currentOdometer, status } = body

    if (!name?.trim() || !brand?.trim() || !plateNumber?.trim()) {
      return NextResponse.json({ error: 'Nama, merek, dan nomor polisi wajib diisi.' }, { status: 400 })
    }

    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan.' }, { status: 404 })
    }

    // Check duplicate plate (exclude self)
    const dupe = await prisma.vehicle.findFirst({
      where: {
        plateNumber: plateNumber.trim().toUpperCase(),
        deletedAt: null,
        id: { not: id },
      },
    })
    if (dupe) {
      return NextResponse.json({ error: 'Nomor polisi sudah digunakan kendaraan lain.' }, { status: 409 })
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
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
        status: status || existing.status,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.VEHICLE_UPDATED,
      entityType: 'vehicle',
      entityId: id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { name: existing.name, plateNumber: existing.plateNumber },
      newValue: { name, plateNumber },
    })

    return NextResponse.json({ success: true, vehicle })
  } catch (err: any) {
    console.error('[Update Vehicle Error]', err)
    return NextResponse.json({ error: 'Gagal mengubah data kendaraan.' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const existing = await prisma.vehicle.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Kendaraan tidak ditemukan.' }, { status: 404 })
    }

    // Check if vehicle is currently in active booking
    const activeBooking = await prisma.booking.findFirst({
      where: {
        vehicleId: id,
        status: { in: ['DISETUJUI', 'MENUNGGU_PEMERIKSAAN_AWAL', 'SIAP_BERANGKAT', 'SEDANG_DIGUNAKAN', 'MENUNGGU_PEMERIKSAAN_PENGEMBALIAN'] },
        deletedAt: null,
      },
    })
    if (activeBooking) {
      return NextResponse.json(
        { error: 'Kendaraan tidak dapat dihapus karena masih memiliki booking aktif.' },
        { status: 400 }
      )
    }

    await prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.VEHICLE_DELETED,
      entityType: 'vehicle',
      entityId: id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { name: existing.name, plateNumber: existing.plateNumber },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Delete Vehicle Error]', err)
    return NextResponse.json({ error: 'Gagal menghapus kendaraan.' }, { status: 500 })
  }
}
