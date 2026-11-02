// app/api/admin/employees/[id]/route.ts
// PUT — Update employee
// DELETE — Delete employee (soft delete)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, nip, nuptk, pangkatGol, jabatan, unit, phoneWa, gender, isActive } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama guru/pegawai wajib diisi.' }, { status: 400 })
    }

    let cleanPhone = phoneWa ? String(phoneWa).replace(/\D/g, '') : null
    if (cleanPhone && cleanPhone.startsWith('08')) {
      cleanPhone = '628' + cleanPhone.slice(2)
    }

    const prev = await prisma.employee.findUnique({ where: { id } })
    if (!prev) {
      return NextResponse.json({ error: 'Data pegawai tidak ditemukan' }, { status: 404 })
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: name.trim(),
        nip: nip ? String(nip).trim() : null,
        nuptk: nuptk ? String(nuptk).trim() : null,
        pangkatGol: pangkatGol ? String(pangkatGol).trim() : null,
        jabatan: jabatan ? String(jabatan).trim() : 'Guru / Tendik',
        unit: unit ? String(unit).trim() : 'SMK Negeri 1 Subang',
        phoneWa: cleanPhone,
        gender: gender ? String(gender).trim() : null,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    })

    await writeAuditLog({
      action: 'EMPLOYEE_UPDATED',
      entityType: 'employee',
      entityId: id,
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      oldValue: { name: prev.name, phoneWa: prev.phoneWa },
      newValue: { name: updated.name, phoneWa: updated.phoneWa },
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (err: any) {
    console.error('[Admin Employee PUT Error]', err)
    return NextResponse.json({ error: 'Gagal memperbarui data pegawai' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const { id } = await params
    const prev = await prisma.employee.findUnique({ where: { id } })
    if (!prev) {
      return NextResponse.json({ error: 'Data pegawai tidak ditemukan' }, { status: 404 })
    }

    await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })

    await writeAuditLog({
      action: 'EMPLOYEE_DELETED',
      entityType: 'employee',
      entityId: id,
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      oldValue: { name: prev.name, nip: prev.nip },
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Admin Employee DELETE Error]', err)
    return NextResponse.json({ error: 'Gagal menghapus data pegawai' }, { status: 500 })
  }
}
