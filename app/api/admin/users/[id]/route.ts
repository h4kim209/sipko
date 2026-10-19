// app/api/admin/users/[id]/route.ts
// PATCH — Update user (toggle active, change role)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const body = await request.json()
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 })
    }

    // Prevent self-deactivation
    if (body.isActive === false && id === session.user?.id) {
      return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri.' }, { status: 400 })
    }

    const data: Record<string, any> = {}
    if (body.isActive !== undefined) data.isActive = body.isActive
    if (body.role) data.role = body.role
    if (body.name) data.name = body.name
    if (body.phoneWa !== undefined) data.phoneWa = body.phoneWa

    await prisma.user.update({ where: { id }, data })

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { isActive: user.isActive, role: user.role },
      newValue: data,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Update User Error]', err)
    return NextResponse.json({ error: 'Gagal mengubah akun.' }, { status: 500 })
  }
}
