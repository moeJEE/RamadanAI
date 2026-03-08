import { create } from 'zustand'
import type { DamSummary } from '@/data/types'

export interface Transfer {
  id: string
  from: DamSummary
  to: DamSummary
  volumeMm3: number
  reason: string
  urgency: 'critical' | 'recommended' | 'preventive'
  energyCostKwh: number
}

export interface ActiveTransfer extends Transfer {
  progress: number
  status: 'starting' | 'pumping' | 'completed'
  flowRate: number
}

interface TransferStore {
  activeTransfers: ActiveTransfer[]
  startTransfer: (transfer: Transfer) => void
  tickLogic: () => void
}

export const useTransferStore = create<TransferStore>((set) => ({
  activeTransfers: [],
  startTransfer: (transfer) => set((state) => {
    // Empêcher les doublons non terminés
    if (state.activeTransfers.some(t => t.id === transfer.id && t.status !== 'completed')) {
      return state
    }
    return {
      activeTransfers: [{
        ...transfer,
        progress: 0,
        status: 'starting',
        flowRate: 0
      }, ...state.activeTransfers]
    }
  }),
  tickLogic: () => set((state) => {
    if (state.activeTransfers.length === 0) return state
    
    return {
      activeTransfers: state.activeTransfers.map(t => {
        if (t.status === 'completed') return t
        
        // Simuler une progression
        const increment = (Math.random() * 3 + 2) / (t.volumeMm3 > 10 ? 2 : 1)
        const newProgress = Math.min(t.progress + increment, 100)
        
        // Fluctuations du débit
        const newFlowRate = t.status === 'starting' && newProgress > 5 
           ? t.volumeMm3 * 1.5 
           : Math.max(0, t.flowRate + (Math.random() * 2 - 1))
           
        return {
          ...t,
          progress: newProgress,
          status: newProgress >= 100 ? 'completed' : newProgress > 5 ? 'pumping' : 'starting',
          flowRate: newProgress >= 100 ? 0 : newFlowRate
        }
      })
    }
  })
}))

// Boucle locale indépendante du composant : le transfert continue même quand on change de page
setInterval(() => {
  useTransferStore.getState().tickLogic()
}, 1000)
