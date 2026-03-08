import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useAlertStore } from '@/stores/alert-store'
import { useTransferStore } from '@/stores/transfer-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowRight, Zap, Droplets, TrendingUp, AlertTriangle, CheckCircle, Play } from 'lucide-react'
import type { DamSummary } from '@/data/types'

interface Transfer {
  id: string
  from: DamSummary
  to: DamSummary
  volumeMm3: number
  reason: string
  urgency: 'critical' | 'recommended' | 'preventive'
  energyCostKwh: number
}



const urgencyConfig = {
  critical:    { label: 'CRITIQUE', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'destructive' as const },
  recommended: { label: 'RECOMMANDÉ', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'secondary' as const },
  preventive:  { label: 'PRÉVENTIF', color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30', badge: 'outline' as const },
}

function FillBar({ pct, label }: { pct: number | null; label: string }) {
  const color = pct == null ? 'bg-gray-400'
    : pct < 15 ? 'bg-red-500' : pct < 40 ? 'bg-orange-400'
    : pct < 65 ? 'bg-yellow-400' : pct < 85 ? 'bg-green-500'
    : pct < 95 ? 'bg-sky-500' : 'bg-violet-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold w-10 text-right">{label}</span>
    </div>
  )
}

export default function TransfertsPage() {
  const navigate = useNavigate()
  const { summaries, loading, loadData } = useDamStore()
  const { loadWeather } = useWeatherStore()
  const { loadAlerts } = useAlertStore()

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [computing, setComputing] = useState(false)

  useEffect(() => { loadData(); loadWeather(); loadAlerts() }, [loadData, loadWeather, loadAlerts])

  useEffect(() => {
    if (summaries.length === 0) return
    const fetchTransfers = async () => {
      setComputing(true)
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario: 'auto',
            horizon_days: 7,
            precip_multiplier: 1.0,
            demand_pop_multiplier: 1.0,
            demand_agri_multiplier: 1.0
          })
        })
        if (!res.ok) throw new Error('Simulation failed')
        const data = await res.json()
        
        const mappedTransfers: Transfer[] = (data.transfers || []).map((t: any, idx: number) => {
           // On recroise les infos avec la liste de barrages existante du store
           const fromDam = summaries.find(s => s.name === t.source_dam) || summaries[0]
           const toDam = summaries.find(s => s.name === t.target_dam) || summaries[0]
           const volMm3 = t.volume_m3 / 1000000
           const urgency = (toDam.fillPercent ?? 0) < 15 ? 'critical' : (toDam.fillPercent ?? 0) < 25 ? 'recommended' : 'preventive'
           
           return {
             id: `T${idx + 1}`,
             from: fromDam,
             to: toDam,
             volumeMm3: volMm3,
             reason: urgency === 'critical' 
               ? `Niveau critique (${toDam.fillPercent?.toFixed(1)}%) — risque rupture`
               : `Stress hydrique (${toDam.fillPercent?.toFixed(1)}%) — transfert préventif`,
             urgency: urgency as any,
             energyCostKwh: t.energy_kwh
           }
        })
        setTransfers(mappedTransfers)
      } catch (err) {
        console.error('Failed to fetch transfers', err)
      } finally {
        setComputing(false)
      }
    }
    fetchTransfers()
  }, [summaries])
  const critical = transfers.filter(t => t.urgency === 'critical')
  const totalVol = transfers.reduce((s, t) => s + t.volumeMm3, 0)
  const totalEnergy = transfers.reduce((s, t) => s + t.energyCostKwh, 0)

  const surplus = summaries.filter(d => (d.fillPercent ?? 0) > 75)
  const deficit = summaries.filter(d => (d.fillPercent ?? 0) < 40)

  // Simulation Logic State (Désormais connecté au store global)
  const { startTransfer } = useTransferStore()
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
  
  const handleStartTransfer = () => {
    if (!selectedTransfer) return
    startTransfer(selectedTransfer)
    setSelectedTransfer(null)
    // Redirection automatique vers la nouvelle page de suivi global
    navigate('/suivi')
  }

  return (
    <BaseLayout
      title="Transferts & Recommandations"
      description="Optimisation des transferts d'eau entre barrages"
    >
      <div className="px-4 lg:px-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Transferts identifiés', value: computing ? '...' : transfers.length, icon: ArrowRight, color: 'text-sky-500', bg: 'bg-sky-500/10' },
            { label: 'Urgences critiques', value: computing ? '...' : critical.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Volume total', value: computing ? '...' : `${totalVol.toFixed(1)} Mm³`, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Énergie estimée', value: computing ? '...' : `${totalEnergy.toFixed(0)} kWh`, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          ].map(k => (
            <Card key={k.label} className="shadow-sm border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${k.bg}`}>
                  <k.icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-xl font-bold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Surplus / Deficit overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Barrages en surplus (&gt;75%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && summaries.length === 0
                ? [1,2].map(i => <Skeleton key={i} className="h-10" />)
                : surplus.length === 0
                  ? <p className="text-sm text-muted-foreground">Aucun barrage en surplus actuellement</p>
                  : surplus.map(d => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <FillBar pct={d.fillPercent} label={`${d.fillPercent?.toFixed(0)}%`} />
                      </div>
                      <Badge variant="default" className="text-xs bg-green-500">surplus</Badge>
                    </div>
                  ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Barrages en déficit (&lt;40%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading && summaries.length === 0
                ? [1,2].map(i => <Skeleton key={i} className="h-10" />)
                : deficit.length === 0
                  ? <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" /> Tous les barrages au-dessus du seuil d'alerte
                    </div>
                  : deficit.map(d => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <FillBar pct={d.fillPercent} label={`${d.fillPercent?.toFixed(0) ?? '—'}%`} />
                      </div>
                      <Badge variant="destructive" className="text-xs">déficit</Badge>
                    </div>
                  ))}
            </CardContent>
          </Card>
        </div>

        {/* Transfer cards */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recommandations de transfert</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && summaries.length === 0
              ? [1,2,3].map(i => <Skeleton key={i} className="h-20" />)
              : transfers.length === 0
                ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="font-semibold">Aucun transfert nécessaire</p>
                    <p className="text-sm text-muted-foreground">Tous les barrages sont dans des niveaux acceptables.</p>
                  </div>
                ) : transfers.map(t => {
                  const cfg = urgencyConfig[t.urgency]
                  return (
                    <div key={t.id} className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                          <Badge variant={cfg.badge} className="text-[10px]">{cfg.label}</Badge>
                        </div>
                        <span className={`text-sm font-bold ${cfg.color}`}>{t.volumeMm3.toFixed(2)} Mm³</span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 text-right">
                          <p className="text-xs text-muted-foreground">De</p>
                          <p className="text-sm font-semibold">{t.from.name}</p>
                          <p className="text-xs text-green-600">{t.from.fillPercent?.toFixed(1)}%</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <ArrowRight className={`h-5 w-5 ${cfg.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Vers</p>
                          <p className="text-sm font-semibold">{t.to.name}</p>
                          <p className={`text-xs ${cfg.color}`}>{t.to.fillPercent?.toFixed(1) ?? '—'}%</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">{t.reason}</p>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          <Zap className="h-3 w-3 inline mr-1 text-yellow-500" />
                          ~{t.energyCostKwh.toFixed(1)} kWh estimés
                        </span>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="h-8 text-xs font-bold gap-1 shadow-sm"
                            onClick={() => setSelectedTransfer(t)}
                          >
                            <Play className="h-3 w-3" />
                            Lancer
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={!!selectedTransfer} onOpenChange={(open) => !open && setSelectedTransfer(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer le transfert d'eau
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point d'initier un pompage massif entre deux bassins. Cette action simulera le protocole SCADA d'AquaRoute AI.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransfer && (
            <div className="py-4 space-y-4">
              <div className="bg-muted p-4 rounded-lg flex items-center justify-between relative overflow-hidden">
                 <div className="absolute right-0 top-0 opacity-10 rotate-12 scale-150">
                    <Droplets className="h-24 w-24" />
                 </div>
                 <div className="z-10">
                   <p className="text-xs text-muted-foreground">Volume total à déplacer</p>
                   <p className="text-2xl font-black text-sky-500">{selectedTransfer.volumeMm3.toFixed(2)} Mm³</p>
                 </div>
                 <div className="text-right z-10">
                   <p className="text-xs text-muted-foreground">Énergie allouée</p>
                   <p className="font-mono font-medium text-yellow-500">{selectedTransfer.energyCostKwh.toFixed(0)} kWh</p>
                 </div>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm font-medium">
                <div className="text-center flex-1 bg-card border rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Source</p>
                  <p className="truncate px-1" title={selectedTransfer.from.name}>{selectedTransfer.from.name}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-center flex-1 bg-card border rounded-md p-2">
                  <p className="text-[10px] text-muted-foreground mb-1">Destination</p>
                  <p className="truncate px-1" title={selectedTransfer.to.name}>{selectedTransfer.to.name}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
              Annuler
            </Button>
            <Button onClick={handleStartTransfer} className="bg-sky-500 hover:bg-sky-600 font-bold">
              Amorcer les pompes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </BaseLayout>
  )
}
