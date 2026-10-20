// app/api/auth/logout/route.ts
// Route logout custom — menghapus cookie sesi dan redirect ke halaman /login domain saat ini

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  const authCookies = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'authjs.csrf-token',
    '__Host-authjs.csrf-token',
    'authjs.callback-url',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
    'next-auth.csrf-token',
    'next-auth.callback-url',
  ]

  for (const name of authCookies) {
    try {
      cookieStore.delete(name)
    } catch {
      // abaikan jika tidak ada
    }
  }

  // Deteksi domain publik aktif dari header proxy atau request URL
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'

  let targetUrl: URL
  if (host && !host.includes('localhost')) {
    targetUrl = new URL(`${proto}://${host}/login`)
  } else {
    targetUrl = new URL('/login', request.url)
  }

  const response = NextResponse.redirect(targetUrl)

  for (const name of authCookies) {
    response.cookies.delete(name)
  }

  return response
}
