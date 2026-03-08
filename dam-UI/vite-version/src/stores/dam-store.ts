import { create } from 'zustand'
import type { DamSummary, DamLevel } from '@/data/types'
import { getDamSummaries, getTotalReserve, getReserveHistory, getDamHistory } from '@/data/barrages'

interface DamStore {
  summaries: DamSummary[]
  totalReserve: { total: number; date: string }
  reserveHistory: { date: string; total: number }[]
  selectedDamHistory: DamLevel[]
  loading: boolean
  initialized: boolean
  
  loadData: () => Promise<void>
  loadDamHistory: (damId: string, days?: number) => Promise<void>
}

export const useDamStore = create<DamStore>((set, get) => ({
  summaries: [],
  totalReserve: { total: 0, date: '' },
  reserveHistory: [],
  selectedDamHistory: [],
  loading: false,
  initialized: false,

  loadData: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      const [summaries, totalReserve, reserveHistory] = await Promise.all([
        getDamSummaries(),
        getTotalReserve(),
        getReserveHistory(90),
      ])
      set({ summaries, totalReserve, reserveHistory, initialized: true })
    } catch (err) {
      console.error('Failed to load dam data:', err)
    } finally {
      set({ loading: false })
    }
  },

  loadDamHistory: async (damId: string, days = 90) => {
    set({ loading: true })
    try {
      const history = await getDamHistory(damId, days)
      set({ selectedDamHistory: history })
    } catch (err) {
      console.error('Failed to load dam history:', err)
    } finally {
      set({ loading: false })
    }
  },
}))
