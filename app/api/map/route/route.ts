// app/api/map/route/route.ts
// GET — Hitung rute/jarak antara dua titik

import { NextRequest, NextResponse } from 'next/server'
import { getMapAdapter } from '@/adapters/map'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const olat = parseFloat(params.get('olat') || '')
  const olng = parseFloat(params.get('olng') || '')
  const dlat = parseFloat(params.get('dlat') || '')
  const dlng = parseFloat(params.get('dlng') || '')

  if ([olat, olng, dlat, dlng].some(isNaN)) {
    return NextResponse.json(
      { error: 'Koordinat tidak valid.' },
      { status: 400 }
    )
  }

  try {
    const adapter = getMapAdapter()
    if (!adapter.isConfigured()) {
      return NextResponse.json(
        { error: 'Layanan peta belum dikonfigurasi.' },
        { status: 503 }
      )
    }
    const route = await adapter.getRoute(olat, olng, dlat, dlng)
    if (!route) {
      return NextResponse.json(
        { error: 'Tidak dapat menghitung rute.' },
        { status: 404 }
      )
    }
    return NextResponse.json(route)
  } catch (err: any) {
    console.error('[Route Error]', err)
    return NextResponse.json(
      { error: 'Gagal menghitung rute.' },
      { status: 500 }
    )
  }
}
