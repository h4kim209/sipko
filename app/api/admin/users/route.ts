// app/api/admin/users/route.ts
// GET — List users, POST — Create user

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phoneWa: true,
      createdAt: true,
    },
  })

  return NextResponse.json({
    users,
    currentUser: {
      id: session.user?.id,
      email: session.user?.email,
      role: session.user?.role,
    },
  })

export async function POST(request: NextRequest) {
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const { name, email, role, phoneWa, password } = await request.json()

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nama, email, dan password wajib diisi.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 })
    }
    if (!['ADMIN', 'APPROVER', 'SUPER_ADMIN', 'DRIVER'].includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
    }

    // Only SUPER_ADMIN can create SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Super Admin yang dapat membuat akun Super Admin.' }, { status: 403 })
    }

    const existing = await prisma.user.findFirst({ where: { email: email.trim(), deletedAt: null } })
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        phoneWa: phoneWa?.trim() || null,
        isActive: true,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: 'user',
      entityId: user.id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      newValue: { name, email, role },
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    }, { status: 201 })
  } catch (err: any) {
    console.error('[Create User Error]', err)
    return NextResponse.json({ error: 'Gagal membuat akun.' }, { status: 500 })
  }
}
