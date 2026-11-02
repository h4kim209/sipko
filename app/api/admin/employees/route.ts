// app/api/admin/employees/route.ts
// GET — List & Search employees for admin
// POST — Create new employee

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const q = request.nextUrl.searchParams.get('q') || ''
    const status = request.nextUrl.searchParams.get('status') || 'ALL'

    const where: any = {
      deletedAt: null,
      ...(status === 'ACTIVE' ? { isActive: true } : status === 'INACTIVE' ? { isActive: false } : {}),
    }

    if (q.trim()) {
      where.OR = [
        { name: { contains: q.trim() } },
        { nip: { contains: q.trim() } },
        { phoneWa: { contains: q.trim() } },
        { jabatan: { contains: q.trim() } },
      ]
    }

    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ employees })
  } catch (err: any) {
    console.error('[Admin Employees GET Error]', err)
    return NextResponse.json({ error: 'Gagal memuat data guru/pemohon' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session?.user) {
    return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, nip, nuptk, pangkatGol, jabatan, unit, phoneWa, gender } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Nama guru/pegawai wajib diisi.' }, { status: 400 })
    }

    // Normalisasi phone jika ada
    let cleanPhone = phoneWa ? String(phoneWa).replace(/\D/g, '') : null
    if (cleanPhone && cleanPhone.startsWith('08')) {
      cleanPhone = '628' + cleanPhone.slice(2)
    }

    const employee = await prisma.employee.create({
      data: {
        name: name.trim(),
        nip: nip ? String(nip).trim() : null,
        nuptk: nuptk ? String(nuptk).trim() : null,
        pangkatGol: pangkatGol ? String(pangkatGol).trim() : null,
        jabatan: jabatan ? String(jabatan).trim() : 'Guru / Tendik',
        unit: unit ? String(unit).trim() : 'SMK Negeri 1 Subang',
        phoneWa: cleanPhone,
        gender: gender ? String(gender).trim() : null,
        isActive: true,
      },
    })

    await writeAuditLog({
      action: 'EMPLOYEE_CREATED',
      entityType: 'employee',
      entityId: employee.id,
      actorId: session.user.id,
      actorName: session.user.name,
      actorRole: session.user.role,
      newValue: { name: employee.name, nip: employee.nip, phoneWa: employee.phoneWa },
    })

    return NextResponse.json({ success: true, employee })
  } catch (err: any) {
    console.error('[Admin Employee POST Error]', err)
    return NextResponse.json({ error: 'Gagal menambahkan data guru/pemohon' }, { status: 500 })
  }
}
