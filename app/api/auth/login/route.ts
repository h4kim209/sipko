// app/api/auth/login/route.ts
// Custom login API — separate from NextAuth for more control

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { writeAuditLog, AUDIT_ACTIONS } from '@/lib/audit'
import { cookies } from 'next/headers'
import { signIn } from '@/lib/auth'

// Rate limiting simple (in-memory, per IP)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000 // 15 menit

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = loginAttempts.get(ip)
  if (!record || now - record.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now })
    return false
  }
  record.count++
  record.lastAttempt = now
  return record.count > MAX_ATTEMPTS
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password wajib diisi.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
        isActive: true,
        deletedAt: null,
        role: { in: ['ADMIN', 'APPROVER', 'SUPER_ADMIN'] },
      },
    })

    if (!user || !user.passwordHash) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'auth',
        actorName: email,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
        newValue: { reason: 'User not found or no password' },
      })
      return NextResponse.json(
        { error: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      await writeAuditLog({
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'auth',
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') || undefined,
        newValue: { reason: 'Invalid password' },
      })
      return NextResponse.json(
        { error: 'Email atau password salah.' },
        { status: 401 }
      )
    }

    // Use NextAuth signIn
    try {
      await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
    } catch {
      // signIn may throw NEXT_REDIRECT which we catch here
    }

    await writeAuditLog({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      entityType: 'auth',
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
    })
  } catch (err: any) {
    console.error('[Login Error]', err)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
