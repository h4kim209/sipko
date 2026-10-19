// proxy.ts — Route protection (Next.js 16: pengganti middleware.ts)
// Melindungi /admin/*, wajib sesi login dengan role staf.

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const STAFF_ROLES = ['ADMIN', 'APPROVER', 'SUPER_ADMIN']

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/admin')) {
    if (!req.auth?.user) {
      const loginUrl = new URL('/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const role = req.auth.user.role as string
    if (!STAFF_ROLES.includes(role)) {
      return NextResponse.redirect(new URL('/login?error=unauthorized', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
