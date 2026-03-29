"use client"

import { useEffect } from 'react'
import { WaterMap } from '@/app/aquaroute/dashboard/components/water-map'
import { useDamStore } from '@/stores/dam-store'
import { useAlertStore } from '@/stores/alert-store'
import { Cloud } from 'lucide-react'

export function LandingDamMap() {
  const { summaries, loading, loadData } = useDamStore()
  const { alerts, loadAlerts } = useAlertStore()

  useEffect(() => {
    loadData()
    loadAlerts()
  }, [loadData, loadAlerts])

  if (loading && summaries.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card shadow-sm flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Cloud className="h-8 w-8 animate-pulse" />
          <span className="text-sm">Chargement de la carte…</span>
        </div>
      </div>
    )
  }

  return (
    <WaterMap
      dams={summaries}
      alerts={alerts}
      showHeader={false}
      showLegend={false}
      showDetailButton={false}
      showAttribution={false}
    />
  )
}
