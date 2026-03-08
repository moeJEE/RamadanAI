import type { WaterNode } from './types'

let _cache: WaterNode[] | null = null

export async function loadNodesData(): Promise<WaterNode[]> {
  if (_cache) return _cache

  const res = await fetch('/data/rsk_water_nodes.csv')
  const text = await res.text()
  const lines = text.split('\n').map(l => l.replace('\r', '').trim()).filter(Boolean)

  const nodes: WaterNode[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(s => s.trim())
    if (cols.length < 9) continue

    nodes.push({
      id: cols[0],
      name: cols[1],
      type: cols[2] as WaterNode['type'],
      lat: cols[3] ? parseFloat(cols[3]) : null,
      lon: cols[4] ? parseFloat(cols[4]) : null,
      provinceRegion: cols[5],
      basin: cols[6],
      status: cols[7],
      sourceNote: cols[8],
    })
  }

  _cache = nodes
  return nodes
}

export async function getNodesByType(type: WaterNode['type']): Promise<WaterNode[]> {
  const nodes = await loadNodesData()
  return nodes.filter(n => n.type === type)
}

export async function getDamNodes(): Promise<WaterNode[]> {
  return getNodesByType('dam')
}

export async function getCityNodes(): Promise<WaterNode[]> {
  return getNodesByType('city')
}
