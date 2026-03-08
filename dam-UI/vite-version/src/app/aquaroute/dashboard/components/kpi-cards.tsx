import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter } from '@/components/ui/card'
import { Droplets, TrendingUp, AlertTriangle, CloudRain } from 'lucide-react'
import type { DamSummary } from '@/data/types'

interface KpiCardsProps {
  totalReserve: { total: number; date: string }
  dams: DamSummary[]
  alertCount: number
  criticalAlertCount: number
  weatherSummary: {
    totalPrecipMm: number
    maxPrecipDay: { date: string; mm: number } | null
  }
}

function getFillColor(pct: number): string {
  if (pct < 15) return 'text-red-500'
  if (pct < 40) return 'text-orange-500'
  if (pct < 65) return 'text-yellow-500'
  if (pct < 85) return 'text-green-500'
  return 'text-sky-500'
}

export function KpiCards({ totalReserve, dams, alertCount, criticalAlertCount, weatherSummary }: KpiCardsProps) {
  const avgFill = dams.length > 0
    ? dams.reduce((s, d) => s + (d.fillPercent ?? 0), 0) / dams.filter(d => d.fillPercent != null).length
    : 0

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Total Reserve */}
      <Card className="@container/card shadow-sm border">
        <CardHeader>
          <CardDescription>Réserve totale</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalReserve.total.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">Mm³</span>
          </CardTitle>
          <CardAction>
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10">
              <Droplets className="size-5 text-sky-500" />
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {dams.length} barrages · {totalReserve.date}
          </div>
        </CardFooter>
      </Card>

      {/* Average Fill Rate */}
      <Card className="@container/card shadow-sm border">
        <CardHeader>
          <CardDescription>Taux moyen</CardDescription>
          <CardTitle className={`text-2xl font-semibold tabular-nums @[250px]/card:text-3xl ${getFillColor(avgFill)}`}>
            {avgFill.toFixed(1)}<span className="text-sm font-normal">%</span>
          </CardTitle>
          <CardAction>
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <TrendingUp className="size-5 text-emerald-500" />
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            Moyenne de {dams.filter(d => d.fillPercent != null).length} barrages
          </div>
        </CardFooter>
      </Card>

      {/* Alerts */}
      <Card className="@container/card shadow-sm border">
        <CardHeader>
          <CardDescription>Alertes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {alertCount}
          </CardTitle>
          <CardAction>
            <div className={`flex size-10 items-center justify-center rounded-lg ${criticalAlertCount > 0 ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
              <AlertTriangle className={`size-5 ${criticalAlertCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {criticalAlertCount > 0 ? `${criticalAlertCount} critique${criticalAlertCount > 1 ? 's' : ''}` : 'Aucune alerte critique'}
          </div>
        </CardFooter>
      </Card>

      {/* Weather 7-day */}
      <Card className="@container/card shadow-sm border">
        <CardHeader>
          <CardDescription>Pluie 7 jours</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {weatherSummary.totalPrecipMm.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">mm</span>
          </CardTitle>
          <CardAction>
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
              <CloudRain className="size-5 text-violet-500" />
            </div>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {weatherSummary.maxPrecipDay ? `Max: ${weatherSummary.maxPrecipDay.mm}mm le ${weatherSummary.maxPrecipDay.date.slice(5)}` : 'Pas de pluie prévue'}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
