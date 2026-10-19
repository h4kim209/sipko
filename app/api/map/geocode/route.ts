// app/api/map/geocode/route.ts
// GET — Geocode pencarian tempat

import { NextRequest, NextResponse } from 'next/server'
import { getMapAdapter } from '@/adapters/map'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] })
  }

  try {
    const adapter = getMapAdapter()
    if (!adapter.isConfigured()) {
      return NextResponse.json(
        { error: 'Layanan peta belum dikonfigurasi.', results: [] },
        { status: 503 }
      )
    }
    const results = await adapter.geocode(q)
    return NextResponse.json({ results })
  } catch (err: any) {
    console.error('[Geocode Error]', err)
    return NextResponse.json({ results: [], error: 'Pencarian tempat gagal.' })
  }
}
