import { useState, useMemo, useEffect } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useWeatherStore } from '@/stores/weather-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Play, RotateCcw, TrendingUp, TrendingDown, AlertTriangle, Droplets, ArrowRight, Activity
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const SCENARIOS = [
  { id: 'custom', label: 'Personnalisé', precip: 1.0, demandPop: 1.0, demandAgri: 1.0, desc: 'Ajuster manuellement' },
  { id: 'heavy_rain', label: 'Pluie forte (×2)', precip: 2.0, demandPop: 1.0, demandAgri: 0.8, desc: 'Précipitation doublée, irrigation réduite' },
  { id: 'drought', label: 'Sécheresse (0 mm, 14j)', precip: 0.0, demandPop: 1.1, demandAgri: 1.5, desc: 'Aucune pluie, demande agricole augmentée' },
  { id: 'peak_irrigation', label: 'Pic irrigation (+50%)', precip: 0.5, demandPop: 1.0, demandAgri: 1.5, desc: 'Saison haute irrigation' },
  { id: 'interconnection_cut', label: 'Coupure interconnexion', precip: 1.0, demandPop: 1.0, demandAgri: 1.0, desc: 'Liaison Sebou → SMBA coupée' },
]

export default function SimulatePage() {
  const { summaries, loading, loadData } = useDamStore()
  const { loadWeather } = useWeatherStore()
  const [scenarioId, setScenarioId] = useState('custom')
  const [precip, setPrecip] = useState(1.0)
  const [demandPop, setDemandPop] = useState(1.0)
  const [demandAgri, setDemandAgri] = useState(1.0)
  const [horizon, setHorizon] = useState(7)
  const [simulated, setSimulated] = useState(false)

  // -- Etats pour la Simulation de Transfert --
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedTarget, setSelectedTarget] = useState<string>('')
  const [transferVol, setTransferVol] = useState<number>(0)
  const [transferHorizon, setTransferHorizon] = useState<number>(7)
  const [transferSimulated, setTransferSimulated] = useState<boolean>(false)

  useEffect(() => { loadData(); loadWeather() }, [loadData, loadWeather])

  // Sélectionne par défaut les deux plus gros barrages si disponibles
  useEffect(() => {
    if (summaries.length > 1 && !selectedSource) {
      setSelectedSource(summaries[0].id) // Plus gros (potentiellement Sebou)
      setSelectedTarget(summaries[1].id) // 2e plus gros (SMBA)
    }
  }, [summaries, selectedSource])

  const scenario = SCENARIOS.find(s => s.id === scenarioId)!
  const applyScenario = (id: string) => {
    setScenarioId(id)
    const s = SCENARIOS.find(sc => sc.id === id)!
    if (id !== 'custom') {
      setPrecip(s.precip); setDemandPop(s.demandPop); setDemandAgri(s.demandAgri)
    }
    setSimulated(false)
  }

  // Simulate results
  const results = useMemo(() => {
    if (!simulated || summaries.length === 0) return null
    return summaries.map(dam => {
      const fill = dam.fillPercent ?? 50
      const dailyChange = (precip * 0.8 - demandPop * 0.3 - demandAgri * 0.5) * (dam.capacityMm3 / 1000)
      const trajectory: { day: string; baseline: number; simulation: number }[] = []
      let baseFill = fill
      let simFill = fill
      for (let d = 0; d <= horizon; d++) {
        trajectory.push({ day: `J${d}`, baseline: Math.max(0, Math.min(100, baseFill)), simulation: Math.max(0, Math.min(100, simFill)) })
        baseFill += (Math.random() - 0.5) * 1.5
        simFill += dailyChange + (Math.random() - 0.5) * 0.5
      }
      const finalSim = trajectory[trajectory.length - 1].simulation
      const status = finalSim < 15 ? 'critical' : finalSim < 40 ? 'warning' : finalSim > 95 ? 'overflow' : 'ok'
      return { dam, trajectory, finalFill: finalSim, status }
    })
  }, [simulated, summaries, precip, demandPop, demandAgri, horizon])

  const criticalCount = results?.filter(r => r.status === 'critical').length ?? 0
  const overflowCount = results?.filter(r => r.status === 'overflow').length ?? 0

  // Simulate Transfer Results
  const transferResults = useMemo(() => {
    if (!transferSimulated || !selectedSource || !selectedTarget || summaries.length === 0) return null
    const sourceDam = summaries.find(d => d.id === selectedSource)
    const targetDam = summaries.find(d => d.id === selectedTarget)
    if (!sourceDam || !targetDam) return null

    // Vitesse constante du transfert répartie sur les jours
    const dailyVolume = transferVol / transferHorizon

    const generateTrajectory = (dam: any, isSource: boolean) => {
      const traj = []
      let baseVol = dam.reserveMm3 ?? (dam.capacityMm3 / 2)
      let simVol = baseVol

      for (let d = 0; d <= transferHorizon; d++) {
        traj.push({
          day: `J${d}`,
          baseline: Math.max(0, Math.min(100, (baseVol / dam.capacityMm3) * 100)),
          simulation: Math.max(0, Math.min(100, (simVol / dam.capacityMm3) * 100))
        })
        
        // Bruit naturel journalier très faible
        const naturalChange = (Math.random() - 0.5) * (dam.capacityMm3 * 0.005)
        baseVol += naturalChange
        
        // La simulation prend en compte le transfert
        const transferChange = isSource ? -dailyVolume : dailyVolume
        simVol += naturalChange + transferChange
      }
      return traj
    }

    const sourceTraj = generateTrajectory(sourceDam, true)
    const targetTraj = generateTrajectory(targetDam, false)

    return {
      source: { dam: sourceDam, trajectory: sourceTraj },
      target: { dam: targetDam, trajectory: targetTraj }
    }
  }, [transferSimulated, summaries, selectedSource, selectedTarget, transferVol, transferHorizon])

  // Get max transfer volume possible based on source
  const sourceDamForMax = summaries.find(d => d.id === selectedSource)
  const targetDamForMax = summaries.find(d => d.id === selectedTarget)
  const maxPossibleTransfer = sourceDamForMax && targetDamForMax
    ? Math.floor(Math.min(
        sourceDamForMax.reserveMm3 ?? 0, 
        targetDamForMax.capacityMm3 - (targetDamForMax.reserveMm3 ?? 0)
      ))
    : 100

  return (
    <BaseLayout title="Simulateur" description="Évaluez l'impact du climat et planifiez virtuellement des transferts.">
      <div className="px-4 lg:px-6 space-y-6">



        <Tabs defaultValue="climat" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="climat" className="font-medium px-6 py-2">
                Climat & Demande
              </TabsTrigger>
              <TabsTrigger value="transfert" className="font-medium px-6 py-2">
                Simuler un Transfert
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1 : CLIMAT */}
          <TabsContent value="climat" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Parameters */}
              <Card className="shadow-sm border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Scenario selector */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Scénario prédéfini</label>
                <Select value={scenarioId} onValueChange={applyScenario}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCENARIOS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{scenario.desc}</p>
              </div>

              {/* Sliders */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Précipitation</span>
                  <span className="font-semibold">×{precip.toFixed(1)}</span>
                </div>
                <Slider value={[precip * 100]} min={0} max={300} step={10}
                  onValueChange={v => { setPrecip(v[0] / 100); setScenarioId('custom'); setSimulated(false) }} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Demande population</span>
                  <span className="font-semibold">×{demandPop.toFixed(1)}</span>
                </div>
                <Slider value={[demandPop * 100]} min={50} max={200} step={10}
                  onValueChange={v => { setDemandPop(v[0] / 100); setScenarioId('custom'); setSimulated(false) }} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Demande agriculture</span>
                  <span className="font-semibold">×{demandAgri.toFixed(1)}</span>
                </div>
                <Slider value={[demandAgri * 100]} min={0} max={250} step={10}
                  onValueChange={v => { setDemandAgri(v[0] / 100); setScenarioId('custom'); setSimulated(false) }} />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Horizon</span>
                  <span className="font-semibold">{horizon} jours</span>
                </div>
                <Slider value={[horizon]} min={3} max={14} step={1}
                  onValueChange={v => { setHorizon(v[0]); setSimulated(false) }} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => setSimulated(true)} disabled={loading && summaries.length === 0}>
                  <Play className="h-4 w-4 mr-1" /> Lancer
                </Button>
                <Button variant="outline" onClick={() => { applyScenario('custom'); setPrecip(1); setDemandPop(1); setDemandAgri(1); setSimulated(false) }}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right: Results */}
          <div className="lg:col-span-2 space-y-6">
            {!simulated ? (
              <Card className="shadow-sm border">
                <CardContent className="py-16 text-center">
                  <Droplets className="h-12 w-12 text-sky-500/30 mx-auto mb-3" />
                  <p className="font-semibold text-lg">Configurez un scénario</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajustez les paramètres à gauche puis cliquez "Lancer"</p>
                </CardContent>
              </Card>
            ) : loading && summaries.length === 0 ? (
              <Skeleton className="h-64" />
            ) : results && (
              <>
                {/* KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: 'Barrages simulés', value: results.length, icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                    { label: 'Risque critique', value: criticalCount, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { label: 'Risque crue', value: overflowCount, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                    { label: 'Horizon', value: `${horizon}j`, icon: TrendingDown, color: 'text-green-500', bg: 'bg-green-500/10' },
                  ].map(k => (
                    <Card key={k.label} className="@container/card shadow-sm border">
                      <CardHeader>
                        <CardDescription>{k.label}</CardDescription>
                        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                          {k.value}
                        </CardTitle>
                        <CardAction>
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${k.bg}`}>
                            <k.icon className={`h-5 w-5 ${k.color}`} />
                          </div>
                        </CardAction>
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                {/* Impact per dam */}
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Impact sur les barrages</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {results.map(r => {
                      const statusCfg = r.status === 'critical'
                        ? { label: 'CRITIQUE', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'destructive' as const }
                        : r.status === 'overflow'
                        ? { label: 'RISQUE CRUE', color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-violet-500/30', badge: 'secondary' as const }
                        : r.status === 'warning'
                        ? { label: 'ATTENTION', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'secondary' as const }
                        : { label: 'OK', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', badge: 'outline' as const }
                      const diff = r.finalFill - (r.dam.fillPercent ?? 50)
                      return (
                        <div key={r.dam.id} className={`rounded-lg border p-3 ${statusCfg.bg} ${statusCfg.border} flex items-center gap-3`}>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{r.dam.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(r.dam.fillPercent ?? 0).toFixed(1)}% → <span className={statusCfg.color}>{r.finalFill.toFixed(1)}%</span>
                              <span className="ml-2">{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span>
                            </p>
                          </div>
                          <Badge variant={statusCfg.badge} className="text-[10px]">{statusCfg.label}</Badge>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                {/* Comparison chart */}
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Comparaison : baseline vs simulation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div style={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={results[0]?.trajectory ?? []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                          <Tooltip
                            formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                            contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fill="#94a3b820" name="Baseline (sans intervention)" strokeDasharray="5 5" isAnimationActive={false} />
                          <Area type="monotone" dataKey="simulation" stroke="#0ea5e9" fill="#0ea5e920" name="Avec scénario" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Courbe : {results[0]?.dam.name ?? '—'} — Les autres barrages sont visibles dans le panel ci-dessus
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </TabsContent>

      {/* TAB 2 : TRANSFERTS */}
      <TabsContent value="transfert" className="mt-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Colonne Paramètres */}
            <Card className="shadow-sm border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Paramètres du Transfert</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Source Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Barrage Source (Émetteur)</label>
                  <Select value={selectedSource} onValueChange={(v) => { setSelectedSource(v); setTransferSimulated(false); setTransferVol(0); }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez un barrage" /></SelectTrigger>
                    <SelectContent>
                      {summaries.map(s => (
                        <SelectItem key={s.id} value={s.id} disabled={s.id === selectedTarget}>
                          {s.name} ({(s.fillPercent ?? 0).toFixed(1)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target Selection */}
                <div className="space-y-2 relative">
                  <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </div>
                  <label className="text-sm font-medium">Barrage Cible (Récepteur)</label>
                  <Select value={selectedTarget} onValueChange={(v) => { setSelectedTarget(v); setTransferSimulated(false); setTransferVol(0); }}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez un barrage" /></SelectTrigger>
                    <SelectContent>
                      {summaries.map(s => (
                        <SelectItem key={s.id} value={s.id} disabled={s.id === selectedSource}>
                          {s.name} ({(s.fillPercent ?? 0).toFixed(1)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Info Box */}
                {sourceDamForMax && targetDamForMax && (
                  <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume dispo. (Source) :</span>
                      <span className="font-semibold text-sky-600">{sourceDamForMax.reserveMm3?.toFixed(1)} Mm³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume libre (Cible) :</span>
                      <span className="font-semibold text-emerald-600">{(targetDamForMax.capacityMm3 - (targetDamForMax.reserveMm3 ?? 0)).toFixed(1)} Mm³</span>
                    </div>
                  </div>
                )}

                {/* Volume Slider */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Volume à Transférer</label>
                    <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                      {transferVol} Mm³
                    </span>
                  </div>
                  <Slider 
                    value={[transferVol]} 
                    min={0} 
                    max={maxPossibleTransfer > 0 ? maxPossibleTransfer : 100} 
                    step={1}
                    disabled={maxPossibleTransfer <= 0}
                    onValueChange={v => { setTransferVol(v[0]); setTransferSimulated(false); }} 
                    className="py-2"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    Maximum possible hydrologiquement : {maxPossibleTransfer} Mm³
                  </p>
                </div>

                {/* Horizon Slider */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium">Durée estimée</span>
                    <span className="font-bold">{transferHorizon} jours</span>
                  </div>
                  <Slider value={[transferHorizon]} min={1} max={30} step={1}
                    onValueChange={v => { setTransferHorizon(v[0]); setTransferSimulated(false) }} />
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => setTransferSimulated(true)} 
                    disabled={!selectedSource || !selectedTarget || transferVol === 0}
                  >
                    <Activity className="h-4 w-4" />
                    Simuler l'Impact
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Colonne Graphes */}
            <div className="lg:col-span-2 space-y-6">
              {!transferSimulated ? (
                <Card className="shadow-sm border h-full flex flex-col justify-center min-h-[400px]">
                  <CardContent className="py-16 text-center">
                    <Activity className="h-12 w-12 text-blue-500/30 mx-auto mb-3" />
                    <p className="font-semibold text-lg">Prêt pour la projection</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                      Sélectionnez vos barrages et le volume pour générer le modèle de remplissage prévisionnel (Proof of Concept).
                    </p>
                  </CardContent>
                </Card>
              ) : transferResults && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Graph Source */}
                    <Card className="shadow-sm border">
                      <CardHeader className="pb-2">
                        <Badge variant="outline" className="w-fit mb-1 border-sky-500/40 text-sky-600 bg-sky-500/10">Source</Badge>
                        <CardTitle className="text-base font-semibold">{transferResults.source.dam.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transferResults.source.trajectory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} width={40} />
                              <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} contentStyle={{ background: 'hsl(var(--card))' }} />
                              <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fill="none" strokeDasharray="4 4" name="Sans transfert" isAnimationActive={false} />
                              <Area type="monotone" dataKey="simulation" stroke="#0284c7" fill="#0284c720" name="Projection" isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Graph Target */}
                    <Card className="shadow-sm border">
                      <CardHeader className="pb-2">
                        <Badge variant="outline" className="w-fit mb-1 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">Cible (Bénéficiaire)</Badge>
                        <CardTitle className="text-base font-semibold">{transferResults.target.dam.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div style={{ height: 220 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={transferResults.target.trajectory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} width={40} />
                              <Tooltip formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} contentStyle={{ background: 'hsl(var(--card))' }} />
                              <Area type="monotone" dataKey="baseline" stroke="#94a3b8" fill="none" strokeDasharray="4 4" name="Sans transfert" isAnimationActive={false} />
                              <Area type="monotone" dataKey="simulation" stroke="#10b981" fill="#10b98120" name="Projection" isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Alert KPI Summary */}
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sky-800 dark:text-sky-300">Synthèse de fin de période ({transferHorizon} j.)</h4>
                      <p className="text-sm text-sky-700/80 dark:text-sky-400/80 mt-1">Impact hydrologique projeté selon le solveur stochastique.</p>
                    </div>
                    <div className="flex gap-6 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Source Perd</p>
                        <p className="text-xl font-bold text-red-500/80">-{transferVol} Mm³</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Cible Gagne</p>
                        <p className="text-xl font-bold text-emerald-500">+{transferVol} Mm³</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
      </TabsContent>
      </Tabs>
      </div>
    </BaseLayout>
  )
}
