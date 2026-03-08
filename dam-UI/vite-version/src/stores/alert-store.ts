import { create } from 'zustand'
import type { WaterAlert } from '@/data/types'

interface AlertStore {
  alerts: WaterAlert[]
  loading: boolean
  error: string | null
  loadAlerts: () => Promise<void>
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],
  loading: false,
  error: null,
  loadAlerts: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/alerts')
      if (!response.ok) throw new Error('API Error')
      const data = await response.json()
      
      const mappedAlerts: WaterAlert[] = data.map((a: any) => {
        let title = `Alerte — ${a.dam_name}`
        if (a.type === 'FLOOD_RISK') title = `Risque de crue — ${a.dam_name}`
        else if (a.type === 'CRITICAL_LOW') title = `Niveau critique — ${a.dam_name}`
        else if (a.type === 'WATER_STRESS') title = `Stress hydrique — ${a.dam_name}`
        else if (a.type === 'OVERFLOW_RISK') title = `Risque de débordement — ${a.dam_name}`

        return {
          id: a.id,
          severity: (a.severity === 'CRITICAL' ? 'critical' : a.severity === 'WARNING' ? 'warning' : 'info') as any,
          type: a.type.toLowerCase() as any,
          damName: a.dam_name,
          damId: a.dam_id,
          title,
          description: a.message,
          recommendation: a.recommendation,
          timestamp: a.created_at,
          fillPercent: a.fill_ratio != null ? parseFloat((a.fill_ratio * 100).toFixed(1)) : undefined
        }
      })
      
      set({ alerts: mappedAlerts, loading: false })
    } catch (err: any) {
      console.error('Failed to load alerts:', err)
      set({ error: err.message, loading: false })
    }
  }
}))
