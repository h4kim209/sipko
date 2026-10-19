// src/adapters/map/osm-adapter.ts
// OpenStreetMap adapter: Nominatim (geocoding) + OSRM (routing)
// Gratis untuk development dan penggunaan moderat
// Rate limit Nominatim: 1 req/detik, wajib User-Agent
// Jangan gunakan endpoint publik untuk traffic production tinggi

import type { GeocodeResult, MapAdapter, RouteResult } from './types'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
const OSRM_URL = 'https://router.project-osrm.org'
const USER_AGENT = `SIPKO/1.0 (sipko.smkn1subang.sch.id; contact: admin@smkn1subang.sch.id)`

export class OsmMapAdapter implements MapAdapter {
  isConfigured(): boolean {
    return true // OSM selalu tersedia (tidak perlu API key)
  }

  getProviderName(): string {
    return 'OpenStreetMap (Nominatim + OSRM)'
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'id', // Indonesia
      addressdetails: '1',
    })

    const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 }, // Cache 5 menit
    })

    if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)

    const data = await res.json()

    return data.map((item: any) => ({
      displayName: item.display_name,
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      confidence: parseFloat(item.importance || '0'),
    }))
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
    })

    const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data || data.error) return null

    return {
      displayName: data.display_name,
      address: data.display_name,
      lat,
      lng,
      confidence: 1,
    }
  }

  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RouteResult | null> {
    const url = `${OSRM_URL}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!res.ok) return null

    const data = await res.json()

    if (data.code !== 'Ok' || !data.routes?.[0]) return null

    const route = data.routes[0]

    return {
      distanceKm: Math.round((route.distance / 1000) * 10) / 10, // 1 desimal
      durationMinutes: Math.round(route.duration / 60),
      provider: 'osrm',
      fetchedAt: new Date().toISOString(),
    }
  }
}
