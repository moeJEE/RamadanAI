import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useAlertStore } from '@/stores/alert-store'
import { useWeatherStore } from '@/stores/weather-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table'
import {
  TrendingUp, TrendingDown, Minus,
  ChevronRight, Search, ArrowUpDown, Droplets,
} from 'lucide-react'
import type { DamSummary } from '@/data/types'

function getFillColor(pct: number | null) {
  if (pct == null) return 'bg-gray-400'
  if (pct < 15) return 'bg-red-500'
  if (pct < 40) return 'bg-orange-400'
  if (pct < 65) return 'bg-yellow-400'
  if (pct < 85) return 'bg-green-500'
  if (pct < 95) return 'bg-sky-500'
  return 'bg-violet-500'
}

function getStatusLabel(pct: number | null): { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } {
  if (pct == null) return { label: 'Inconnu', variant: 'outline' }
  if (pct < 15) return { label: 'Critique', variant: 'destructive' }
  if (pct < 40) return { label: 'Bas', variant: 'destructive' }
  if (pct < 65) return { label: 'Moyen', variant: 'secondary' }
  if (pct < 85) return { label: 'Bon', variant: 'default' }
  return { label: 'Élevé', variant: 'default' }
}

type SortKey = 'name' | 'fillPercent' | 'reserveMm3' | 'capacityMm3' | 'trend7d'

export default function BarragesPage() {
  const navigate = useNavigate()
  const { summaries, loading, loadData } = useDamStore()
  const { loadWeather } = useWeatherStore()
  const { alerts, loadAlerts } = useAlertStore()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('fillPercent')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    loadData()
    loadWeather()
    loadAlerts()
  }, [loadData, loadWeather, loadAlerts])

  const alertMap = new Map(alerts.map(a => [a.damId, a]))

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p)
    else { setSortKey(key); setSortAsc(false) }
  }

  const filtered: DamSummary[] = summaries
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va: number, vb: number
      if (sortKey === 'name') return sortAsc
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
      va = (a[sortKey] as number | null) ?? -Infinity
      vb = (b[sortKey] as number | null) ?? -Infinity
      return sortAsc ? va - vb : vb - va
    })

  const SortIcon = ({ col }: { col: SortKey }) =>
    <ArrowUpDown className={`h-3 w-3 ml-1 opacity-${sortKey === col ? 100 : 30}`} />

  return (
    <BaseLayout
      title="Barrages"
      description={`${summaries.length} barrages surveillés — Région Rabat-Salé-Kénitra`}
    >
      <div className="px-4 lg:px-6 space-y-6">

        {/* KPI summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total barrages', value: summaries.length,
              icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-500/10',
            },
            {
              label: 'Critique (<15%)',
              value: summaries.filter(d => (d.fillPercent ?? 0) < 15).length,
              icon: Minus, color: 'text-red-500', bg: 'bg-red-500/10',
            },
            {
              label: 'Bon état (>65%)',
              value: summaries.filter(d => (d.fillPercent ?? 0) >= 65).length,
              icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10',
            },
            {
              label: 'Capacité totale',
              value: `${summaries.reduce((s, d) => s + d.capacityMm3, 0).toFixed(0)} Mm³`,
              icon: Droplets, color: 'text-violet-500', bg: 'bg-violet-500/10',
            },
          ].map(kpi => (
            <Card key={kpi.label} className="@container/card shadow-sm border">
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {kpi.value}
                </CardTitle>
                <CardAction>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card className="@container/card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold">Liste des barrages</CardTitle>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-6">
            {loading && summaries.length === 0 ? (
              <div className="p-4 space-y-2">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead>
                        <button className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground" onClick={() => handleSort('name')}>
                          Barrage <SortIcon col="name" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground" onClick={() => handleSort('fillPercent')}>
                          Remplissage <SortIcon col="fillPercent" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        <button className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground" onClick={() => handleSort('reserveMm3')}>
                          Réserve <SortIcon col="reserveMm3" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">
                        <button className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground" onClick={() => handleSort('capacityMm3')}>
                          Capacité <SortIcon col="capacityMm3" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        <button className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground" onClick={() => handleSort('trend7d')}>
                          Tendance 7j <SortIcon col="trend7d" />
                        </button>
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide">Statut</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody className="**:data-[slot=table-cell]:first:w-8">
                  {filtered.map(dam => {
                    const { label, variant } = getStatusLabel(dam.fillPercent)
                    const alert = alertMap.get(dam.id)
                    return (
                      <TableRow
                        key={dam.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/dam/${dam.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {alert && (
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm">{dam.name}</span>
                          </div>
                          {dam.basin && (
                            <p className="text-xs text-muted-foreground mt-0.5">{dam.basin}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getFillColor(dam.fillPercent)}`}
                                style={{ width: `${Math.min(dam.fillPercent ?? 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-12 text-right">
                              {dam.fillPercent != null ? `${dam.fillPercent.toFixed(1)}%` : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {dam.reserveMm3 != null ? `${dam.reserveMm3.toFixed(3)} Mm³` : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {dam.capacityMm3} Mm³
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {dam.trend7d != null ? (
                            <span className={`flex items-center gap-1 text-sm font-medium ${dam.trend7d > 0 ? 'text-green-500' : dam.trend7d < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                              {dam.trend7d > 0
                                ? <TrendingUp className="h-3 w-3" />
                                : dam.trend7d < 0
                                  ? <TrendingDown className="h-3 w-3" />
                                  : <Minus className="h-3 w-3" />}
                              {dam.trend7d > 0 ? '+' : ''}{dam.trend7d.toFixed(2)}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant} className="text-xs">{label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
