// src/adapters/map/types.ts
// Interface adapter peta dan geocoding

export interface GeocodeResult {
  displayName: string
  address: string
  lat: number
  lng: number
  confidence: number
}

export interface RouteResult {
  distanceKm: number
  durationMinutes: number
  provider: string
  fetchedAt: string // ISO string
}

export interface MapAdapter {
  geocode(query: string): Promise<GeocodeResult[]>
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null>
  getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RouteResult | null>
  isConfigured(): boolean
  getProviderName(): string
}
