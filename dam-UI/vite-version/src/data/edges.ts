import type { WaterEdge } from './types'

let _cache: WaterEdge[] | null = null

export async function loadEdgesData(): Promise<WaterEdge[]> {
  if (_cache) return _cache

  try {
    const res = await fetch('http://127.0.0.1:8000/api/v1/graph/snapshot')
    if (!res.ok) throw new Error('API Error')
    const data = await res.json()

    // Map backend GraphQL-like 'edges' to frontend 'WaterEdge' format
    const edges: WaterEdge[] = (data.edges || []).map((e: any) => ({
      sourceId: e.source_id,
      targetId: e.target_id,
      relationType: e.relation_type,
      status: 'active', // Derived safely
      distanceKm: e.distance_km,
      note: 'Mapped from API',
    }))

    _cache = edges
    return edges
  } catch (err) {
    console.error('Failed to load edges from backend:', err)
    return []
  }
}
