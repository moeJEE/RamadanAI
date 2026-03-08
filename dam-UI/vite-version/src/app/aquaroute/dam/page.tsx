import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useAlertStore } from '@/stores/alert-store'
import { LevelGauge } from './components/level-gauge'
import { WeatherTable } from './components/weather-table'
import { HistoryChart } from './components/history-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function DamDetailPage() {
  const { damId } = useParams<{ damId: string }>()
  const navigate = useNavigate()

  const { summaries, selectedDamHistory, loading, loadData, loadDamHistory } = useDamStore()
  const { forecasts, loadWeather } = useWeatherStore()
  const { alerts, loadAlerts } = useAlertStore()

  useEffect(() => {
    loadData()
    loadWeather()
    loadAlerts()
  }, [loadData, loadWeather, loadAlerts])

  useEffect(() => {
    if (damId) {
      loadDamHistory(damId, 90)
    }
  }, [damId, loadDamHistory])

  const dam = summaries.find(d => d.id === damId)
  const damAlerts = alerts.filter(a => a.damId === damId)

  if (loading && !dam) {
    return (
      <BaseLayout title="Chargement...">
        <div className="px-4 lg:px-6 space-y-6">
          <Skeleton className="h-12 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 lg:col-span-2" />
          </div>
        </div>
      </BaseLayout>
    )
  }

  if (!dam) {
    return (
      <BaseLayout title="Barrage introuvable">
        <div className="px-4 lg:px-6">
          <p className="text-muted-foreground mb-4">Le barrage "{damId}" n'a pas été trouvé dans les données.</p>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour au dashboard
          </Button>
        </div>
      </BaseLayout>
    )
  }

  const TrendIcon = dam.trend7d != null && dam.trend7d > 0
    ? TrendingUp
    : dam.trend7d != null && dam.trend7d < 0
      ? TrendingDown
      : Minus

  return (
    <BaseLayout>
      <div className="px-4 lg:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{dam.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bassin : {dam.basin ?? 'N/A'} · Capacité : {dam.capacityMm3} Mm³ · Dernière mise à jour : {dam.latestDate}
            </p>
          </div>
          {dam.trend7d != null && (
            <Badge variant={dam.trend7d > 0 ? 'default' : dam.trend7d < 0 ? 'destructive' : 'secondary'} className="h-7 px-3">
              <TrendIcon className="h-3 w-3 mr-1" />
              {dam.trend7d > 0 ? '+' : ''}{dam.trend7d.toFixed(1)}% / 7j
            </Badge>
          )}
        </div>

        {/* Alerts for this dam */}
        {damAlerts.length > 0 && (
          <div className="space-y-2">
            {damAlerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 text-sm ${alert.severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : alert.severity === 'warning'
                    ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                    : 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                  }`}
              >
                <p className="font-semibold">{alert.title}</p>
                <p className="mt-0.5 opacity-80">{alert.description}</p>
                <p className="mt-1 text-xs opacity-60">💡 {alert.recommendation}</p>
              </div>
            ))}
          </div>
        )}

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Level Gauge */}
          <LevelGauge
            name={dam.name}
            fillPercent={dam.fillPercent}
            reserveMm3={dam.reserveMm3}
            capacityMm3={dam.capacityMm3}
          />

          {/* History Chart */}
          <div className="lg:col-span-2">
            <HistoryChart data={selectedDamHistory} damName={dam.name} />
          </div>
        </div>

        {/* Weather Table */}
        <WeatherTable forecasts={forecasts} />

        {/* Info card */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Capacité</p>
                <p className="font-semibold">{dam.capacityMm3} Mm³</p>
              </div>
              <div>
                <p className="text-muted-foreground">Réserve actuelle</p>
                <p className="font-semibold">{dam.reserveMm3?.toFixed(3) ?? 'N/A'} Mm³</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taux de remplissage</p>
                <p className="font-semibold">{dam.fillPercent?.toFixed(2) ?? 'N/A'}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Tendance 7 jours</p>
                <p className="font-semibold">
                  {dam.trend7d != null ? `${dam.trend7d > 0 ? '+' : ''}${dam.trend7d.toFixed(2)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
