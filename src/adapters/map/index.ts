// src/adapters/map/index.ts
// Factory map adapter berdasarkan MAP_PROVIDER

import type { MapAdapter } from './types'
import { OsmMapAdapter } from './osm-adapter'

let _mapAdapter: MapAdapter | null = null

export function getMapAdapter(): MapAdapter {
  if (_mapAdapter) return _mapAdapter

  const provider = process.env.MAP_PROVIDER || 'osm'

  if (provider === 'google') {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.warn('[Map] GOOGLE_MAPS_API_KEY tidak diset. Fallback ke OSM.')
      _mapAdapter = new OsmMapAdapter()
    } else {
      // Google adapter dapat diimplementasikan di google-adapter.ts
      // Saat ini fallback ke OSM
      console.warn('[Map] Google Maps adapter belum diimplementasikan. Menggunakan OSM.')
      _mapAdapter = new OsmMapAdapter()
    }
  } else {
    _mapAdapter = new OsmMapAdapter()
  }

  return _mapAdapter
}

export type { MapAdapter, GeocodeResult, RouteResult } from './types'
