import type { DamLevel, DamSummary } from './types'
import { damApi } from './api-client'

// ── Helpers ──

export function damNameToId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseCSVLine(line: string): string[] {
  return line.split(',').map(s => s.trim())
}

function parseNumber(val: string): number | null {
  if (!val || val === '-' || val === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

// ── CSV fallback (used when backend is offline) ──

let _csvCache: DamLevel[] | null = null

async function loadBarragesCSV(): Promise<DamLevel[]> {
  if (_csvCache) return _csvCache
  const res = await fetch('/data/barrages_data.csv')
  const text = await res.text()
  const lines = text.split('\n').map(l => l.replace('\r', '').trim()).filter(Boolean)
  const data: DamLevel[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 5) continue
    const [date, name, capStr, resStr, fillStr] = cols
    if (name.includes('serve totale')) continue
    const damName = name.trim()
    data.push({
      date,
      damName,
      damId: damNameToId(damName),
      capacityMm3: parseNumber(capStr) ?? 0,
      reserveMm3: parseNumber(resStr),
      fillPercent: parseNumber(fillStr),
    })
  }
  _csvCache = data
  return data
}

// ── API-first functions ──

let _apiAvailable: boolean | null = null

async function isApiAvailable(): Promise<boolean> {
  if (_apiAvailable !== null) return _apiAvailable
  try {
    const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) })
    _apiAvailable = res.ok
  } catch {
    _apiAvailable = false
  }
  // Retry check after 30s
  setTimeout(() => { _apiAvailable = null }, 30000)
  return _apiAvailable
}

export async function loadBarragesData(): Promise<DamLevel[]> {
  // Try API first
  if (await isApiAvailable()) {
    try {
      const ranking = await damApi.ranking()
      // The ranking endpoint returns the latest levels per dam
      return ranking.map((d: any) => ({
        date: d.latest_date || '',
        damName: d.dam_name,
        damId: d.dam_id,
        capacityMm3: (d.capacity_m3 || 0) / 1e6,
        reserveMm3: d.reserve_m3 != null ? d.reserve_m3 / 1e6 : null,
        fillPercent: d.fill_ratio != null ? d.fill_ratio * 100 : null,
      }))
    } catch (err) {
      console.warn('API ranking failed, falling back to CSV:', err)
    }
  }
  return loadBarragesCSV()
}

export async function getLatestLevels(): Promise<DamLevel[]> {
  const data = await loadBarragesData()
  if (data.length === 0) return []
  const latestDate = data.reduce((max, d) => d.date > max ? d.date : max, data[0].date)
  return data.filter(d => d.date === latestDate)
}

export async function getDamHistory(damId: string, days: number = 90): Promise<DamLevel[]> {
  // Try API first
  if (await isApiAvailable()) {
    try {
      const levels = await damApi.levels(damId, days)
      return levels.map((l: any) => ({
        date: l.date,
        damName: l.dam_name,
        damId: l.dam_id,
        capacityMm3: (l.capacity_m3 || 0) / 1e6,
        reserveMm3: l.reserve_m3 != null ? l.reserve_m3 / 1e6 : null,
        fillPercent: l.fill_ratio != null ? l.fill_ratio * 100 : null,
      }))
    } catch (err) {
      console.warn('API levels failed, falling back to CSV:', err)
    }
  }
  // Fallback to CSV
  const data = await loadBarragesCSV()
  const damData = data.filter(d => d.damId === damId).sort((a, b) => b.date.localeCompare(a.date))
  const uniqueDates = [...new Set(damData.map(d => d.date))]
  const cutoffDates = new Set(uniqueDates.slice(0, days))
  return damData.filter(d => cutoffDates.has(d.date)).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getDamSummaries(): Promise<DamSummary[]> {
  // Try API first
  if (await isApiAvailable()) {
    try {
      const ranking = await damApi.ranking()
      return ranking.map((d: any) => ({
        id: d.dam_id,
        name: d.dam_name,
        latestDate: d.latest_date || '',
        capacityMm3: (d.capacity_m3 || 0) / 1e6,
        reserveMm3: d.reserve_m3 != null ? d.reserve_m3 / 1e6 : null,
        fillPercent: d.fill_ratio != null ? d.fill_ratio * 100 : null,
        trend7d: null,
        lat: d.lat ?? null,
        lon: d.lon ?? null,
        basin: d.basin ?? null,
      }))
    } catch (err) {
      console.warn('API ranking failed, falling back to CSV:', err)
    }
  }

  // Fallback: original CSV approach
  const data = await loadBarragesCSV()
  if (data.length === 0) return []
  const latestDate = data.reduce((max, d) => d.date > max ? d.date : max, data[0].date)
  const latestData = data.filter(d => d.date === latestDate)
  const { loadNodesData } = await import('./nodes')
  const nodes = await loadNodesData()
  const nodeMap = new Map(nodes.map(n => [n.name, n]))
  const summaries: DamSummary[] = []
  for (const dam of latestData) {
    const weekAgoDate = new Date(latestDate)
    weekAgoDate.setDate(weekAgoDate.getDate() - 7)
    const weekAgoStr = weekAgoDate.toISOString().split('T')[0]
    const weekAgoData = data.find(d => d.damId === dam.damId && d.date === weekAgoStr)
    let trend7d: number | null = null
    if (weekAgoData?.fillPercent != null && dam.fillPercent != null) {
      trend7d = Math.round((dam.fillPercent - weekAgoData.fillPercent) * 100) / 100
    }
    const node = nodeMap.get(dam.damName) ||
      [...nodeMap.values()].find(n => dam.damName.includes(n.name) || n.name.includes(dam.damName))
    summaries.push({
      id: dam.damId,
      name: dam.damName,
      latestDate: dam.date,
      capacityMm3: dam.capacityMm3,
      reserveMm3: dam.reserveMm3,
      fillPercent: dam.fillPercent,
      trend7d,
      lat: node?.lat ?? null,
      lon: node?.lon ?? null,
      basin: node?.basin ?? null,
    })
  }
  return summaries.sort((a, b) => (b.fillPercent ?? 0) - (a.fillPercent ?? 0))
}

export async function getTotalReserve(): Promise<{ total: number; date: string }> {
  // Try API first
  if (await isApiAvailable()) {
    try {
      const summary = await damApi.summary()
      return {
        total: Math.round((summary.total_reserve_m3 / 1e6) * 1000) / 1000,
        date: new Date().toISOString().split('T')[0],
      }
    } catch (err) {
      console.warn('API summary failed:', err)
    }
  }
  const latest = await getLatestLevels()
  const total = latest.reduce((sum, d) => sum + (d.reserveMm3 ?? 0), 0)
  return { total: Math.round(total * 1000) / 1000, date: latest[0]?.date ?? '' }
}

export async function getReserveHistory(days: number = 90): Promise<{ date: string; total: number }[]> {
  // For now, always use CSV for history (backend doesn't have a specific aggregate endpoint yet)
  const data = await loadBarragesCSV()
  const byDate = new Map<string, number>()
  for (const d of data) {
    const current = byDate.get(d.date) ?? 0
    byDate.set(d.date, current + (d.reserveMm3 ?? 0))
  }
  return [...byDate.entries()]
    .map(([date, total]) => ({ date, total: Math.round(total * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
}
