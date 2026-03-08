import { useEffect } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useAlertStore } from '@/stores/alert-store'
import { KpiCards } from './components/kpi-cards'
import { DamRanking } from './components/dam-ranking'
import { ReserveChart } from './components/reserve-chart'
import { WaterMap } from './components/water-map'
import { WeatherOverview } from './components/weather-overview'
import { BalanceChart, DemandDonut } from './components/balance-charts'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardPage() {
  const { summaries, totalReserve, reserveHistory, loading, loadData } = useDamStore()
  const { forecasts, summary: weatherSummary, loadWeather } = useWeatherStore()
  const { alerts, loadAlerts } = useAlertStore()

  useEffect(() => {
    loadData()
    loadWeather()
    loadAlerts()
  }, [loadData, loadWeather, loadAlerts])

  if (loading && summaries.length === 0) {
    return (
      <BaseLayout title="Dashboard">
        <div className="px-4 lg:px-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </BaseLayout>
    )
  }

  return (
    <BaseLayout title="Dashboard" description="Gestion prédictive de l'eau — Région Rabat-Salé-Kénitra">
      <div className="px-4 lg:px-6 space-y-6">
        {/* KPI Cards */}
        <KpiCards
          totalReserve={totalReserve}
          dams={summaries}
          alertCount={alerts.length}
          criticalAlertCount={alerts.filter(a => a.severity === 'critical').length}
          weatherSummary={weatherSummary}
        />

        {/* Map + Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WaterMap dams={summaries} alerts={alerts} />
          </div>
          <div>
            <WeatherOverview forecasts={forecasts} summary={weatherSummary} />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReserveChart history={reserveHistory} />
          <DamRanking dams={summaries} />
        </div>

        {/* Balance + Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BalanceChart />
          <DemandDonut />
        </div>
      </div>
    </BaseLayout>
  )
}
