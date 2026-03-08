/**
 * AquaRoute API Client
 * Centralizes all backend communication.
 */

const API_BASE = 'http://localhost:8000/api/v1'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

// ── Dams ──

export const damApi = {
  list: (type?: string) =>
    apiFetch<any[]>(`/dams${type ? `?type=${type}` : ''}`),

  summary: () =>
    apiFetch<{
      total_capacity_m3: number
      total_reserve_m3: number
      avg_fill_ratio: number
      dam_count: number
      critical_count: number
      warning_count: number
      overflow_risk_count: number
    }>('/dams/summary'),

  ranking: () =>
    apiFetch<any[]>('/dams/ranking'),

  levels: (damId: string, days?: number) =>
    apiFetch<any[]>(`/dams/${damId}/levels${days ? `?days=${days}` : ''}`),

  seed: () =>
    apiFetch<any>('/dams/seed', { method: 'POST' }),
}

// ── Weather ──

export const weatherApi = {
  fetch: () =>
    apiFetch<any>('/weather/fetch'),

  byLocation: (location: string) =>
    apiFetch<any>(`/weather/${location}`),
}

// ── Graph ──

export const graphApi = {
  snapshot: () =>
    apiFetch<{ nodes: any[]; edges: any[] }>('/graph/snapshot'),

  subgraph: (nodeId: string, depth?: number) =>
    apiFetch<any>(`/graph/subgraph?node_id=${nodeId}${depth ? `&depth=${depth}` : ''}`),
}

// ── Alerts ──

export const alertApi = {
  list: (severity?: string) =>
    apiFetch<any[]>(`/alerts${severity ? `?severity=${severity}` : ''}`),
}

// ── Simulation ──

export const simulateApi = {
  run: (params: {
    precip_multiplier?: number
    demand_pop_multiplier?: number
    scenario?: string
    horizon_days?: number
  }) =>
    apiFetch<any>('/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
}

// ── Models ──

export const modelsApi = {
  demand: (params: {
    dam_id: string
    day_of_year?: number
    month?: number
    temp_mean?: number
    precip_mm?: number
    fill_ratio?: number
  }) =>
    apiFetch<any>('/models/demand/run', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  gnn: (params?: { month?: number }) =>
    apiFetch<any>('/models/gnn/run', {
      method: 'POST',
      body: JSON.stringify(params ?? {}),
    }),

  recommendations: () =>
    apiFetch<any>('/models/recommendations/latest'),
}

// ── Agent ──

export const agentApi = {
  chat: (message: string, conversationId?: string) =>
    apiFetch<{
      reply: string
      conversation_id: string | null
      timestamp: string
      tool_used: string | null
    }>('/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId }),
    }),
}
