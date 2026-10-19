// app/api/admin/users/[id]/route.ts
// PATCH / PUT — Update user (toggle active, change role, edit details, change password)
// DELETE — Soft-delete user

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiAuth } from '@/lib/auth-guard'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import bcrypt from 'bcryptjs'

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

    // Protect system account from critical mutations
    if (id === 'system' || user.email === 'system@sipko.local') {
      if (body.isActive === false || body.deletedAt !== undefined) {
        return NextResponse.json({ error: 'Akun sistem tidak dapat dinonaktifkan atau dihapus.' }, { status: 400 })
      }
    }

    // Prevent self-deactivation
    if (body.isActive === false && id === session.user?.id) {
      return NextResponse.json({ error: 'Tidak dapat menonaktifkan akun sendiri yang sedang digunakan.' }, { status: 400 })
    }

    // Only SUPER_ADMIN can edit or assign SUPER_ADMIN role
    if ((user.role === 'SUPER_ADMIN' || body.role === 'SUPER_ADMIN') && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Super Admin yang dapat mengelola akun Super Admin.' }, { status: 403 })
    }

    const data: Record<string, any> = {}

    if (body.name !== undefined) {
      if (!body.name.trim()) return NextResponse.json({ error: 'Nama tidak boleh kosong.' }, { status: 400 })
      data.name = body.name.trim()
    }

    if (body.email !== undefined) {
      const emailTrimmed = body.email.trim().toLowerCase()
      if (!emailTrimmed) return NextResponse.json({ error: 'Email tidak boleh kosong.' }, { status: 400 })
      if (emailTrimmed !== user.email) {
        const existing = await prisma.user.findFirst({
          where: { email: emailTrimmed, deletedAt: null, id: { not: id } },
        })
        if (existing) {
          return NextResponse.json({ error: 'Email sudah terdaftar untuk akun lain.' }, { status: 409 })
        }
      }
      data.email = emailTrimmed
    }

    if (body.role !== undefined) {
      if (!['ADMIN', 'APPROVER', 'SUPER_ADMIN', 'DRIVER'].includes(body.role)) {
        return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 })
      }
      data.role = body.role
    }

    if (body.phoneWa !== undefined) {
      data.phoneWa = body.phoneWa?.trim() || null
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive)
    }

    if (body.password && typeof body.password === 'string') {
      if (body.password.length < 8) {
        return NextResponse.json({ error: 'Password minimal 8 karakter.' }, { status: 400 })
      }
      data.passwordHash = await bcrypt.hash(body.password, 12)
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        phoneWa: true,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: 'user',
      entityId: id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { name: user.name, email: user.email, role: user.role, isActive: user.isActive },
      newValue: { name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive },
    })

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('[Update User Error]', err)
    return NextResponse.json({ error: 'Gagal mengubah data akun.' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await apiAuth(['ADMIN', 'SUPER_ADMIN'])
  if (!session) return NextResponse.json({ error: 'Tidak terotorisasi' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || user.deletedAt) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 })
    }

    // Protect system account
    if (id === 'system' || user.email === 'system@sipko.local') {
      return NextResponse.json({ error: 'Akun sistem tidak dapat dihapus.' }, { status: 400 })
    }

    // Prevent self-deletion
    if (id === session.user?.id) {
      return NextResponse.json({ error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' }, { status: 400 })
    }

    // Only SUPER_ADMIN can delete SUPER_ADMIN
    if (user.role === 'SUPER_ADMIN' && session.user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Hanya Super Admin yang dapat menghapus akun Super Admin.' }, { status: 403 })
    }

    // Soft-delete user
    await prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    await writeAuditLog({
      action: AUDIT_ACTIONS.USER_DELETED,
      entityType: 'user',
      entityId: id,
      actorId: session.user?.id,
      actorName: session.user?.name,
      actorRole: session.user?.role,
      oldValue: { name: user.name, email: user.email, role: user.role },
    })

    return NextResponse.json({ success: true, message: 'Akun berhasil dihapus.' })
  } catch (err: any) {
    console.error('[Delete User Error]', err)
    return NextResponse.json({ error: 'Gagal menghapus akun.' }, { status: 500 })
  }
}
