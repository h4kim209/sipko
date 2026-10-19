// src/lib/auth-guard.ts
// Server-side auth utilities for admin pages/APIs

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    redirect('/login?error=unauthorized')
  }
  return session
}

export async function getSession() {
  return auth()
}

// API-level auth check (returns null instead of redirect)
export async function apiAuth(allowedRoles?: Role[]) {
  const session = await auth()
  if (!session?.user) return null
  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) return null
  return session
}
