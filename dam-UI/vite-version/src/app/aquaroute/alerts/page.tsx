import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { useWeatherStore } from '@/stores/weather-store'
import { useAlertStore } from '@/stores/alert-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Info, ShieldAlert, ExternalLink, CheckCircle, Settings, Bell } from 'lucide-react'

const severityConfig = {
  critical: { icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'destructive' as const },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'secondary' as const },
  info: { icon: Info, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30', badge: 'outline' as const },
}

// Simulated resolved alerts
const resolvedAlerts = [
  { id: 'r1', title: 'Stress hydrique résolu — El Himer', description: 'Taux remonté à 28% après transfert préventif depuis SMBA', severity: 'warning' as const, resolvedAt: 'Il y a 2 jours' },
  { id: 'r2', title: 'Risque crue évité — Tamesna', description: 'Vidange préventive effectuée avant fortes pluies du 03/03', severity: 'critical' as const, resolvedAt: 'Il y a 5 jours' },
  { id: 'r3', title: 'Maintenance terminée — Station Bouregreg', description: 'Station de traitement remise en service', severity: 'info' as const, resolvedAt: 'Il y a 1 semaine' },
]

export default function AlertsPage() {
  const navigate = useNavigate()
  const { summaries, loading, loadData } = useDamStore()
  const { loadWeather } = useWeatherStore()
  const { alerts, loadAlerts } = useAlertStore()

  // Threshold config state
  const [floodPrecip, setFloodPrecip] = useState(15)
  const [floodFill, setFloodFill] = useState(85)
  const [criticalFill, setCriticalFill] = useState(15)
  const [stressDemand, setStressDemand] = useState(80)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifWS, setNotifWS] = useState(true)
  const [notifSMS, setNotifSMS] = useState(false)

  useEffect(() => {
    loadData()
    loadWeather()
    loadAlerts()
  }, [loadData, loadWeather, loadAlerts])

  if (loading && summaries.length === 0) {
    return (
      <BaseLayout title="Alertes">
        <div className="px-4 lg:px-6 space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </BaseLayout>
    )
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  const warningAlerts = alerts.filter(a => a.severity === 'warning')
  const infoAlerts = alerts.filter(a => a.severity === 'info')

  function AlertCard({ alert }: { alert: typeof alerts[0] }) {
    const config = severityConfig[alert.severity]
    const Icon = config.icon
    return (
      <Card className={`border shadow-md ${config.border} ${config.bg}`}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-sm">{alert.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                </div>
                <Badge variant={config.badge} className="text-[10px] flex-shrink-0">
                  {alert.severity === 'critical' ? 'CRITIQUE' : alert.severity === 'warning' ? 'ATTENTION' : 'INFO'}
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">💡 {alert.recommendation}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => navigate(`/dam/${alert.damId}`)}>
                    Voir barrage <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs"
                    onClick={() => navigate('/simulate')}>
                    Simuler
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <BaseLayout title="Alertes" description={`${alerts.length} alerte${alerts.length !== 1 ? 's' : ''} active${alerts.length !== 1 ? 's' : ''} — système de surveillance AquaRoute AI`}>
      <div className="px-4 lg:px-6 space-y-6">

        {/* Summary badges */}
        <div className="flex gap-3 flex-wrap">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <ShieldAlert className="h-3 w-3 mr-1" />
            {criticalAlerts.length} critique{criticalAlerts.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1 border-orange-500/30 text-orange-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warningAlerts.length} avertissement{warningAlerts.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Info className="h-3 w-3 mr-1" />
            {infoAlerts.length} info{infoAlerts.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 text-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            {resolvedAlerts.length} résolue{resolvedAlerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">
              <Bell className="h-3.5 w-3.5 mr-1" />
              Actives ({alerts.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Résolues ({resolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="h-3.5 w-3.5 mr-1" />
              Configuration
            </TabsTrigger>
          </TabsList>

          {/* Active alerts tab */}
          <TabsContent value="active">
            {alerts.length === 0 ? (
              <Card className="shadow-sm border">
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    </div>
                  </div>
                  <p className="font-semibold">Aucune alerte active</p>
                  <p className="text-sm text-muted-foreground mt-1">Tous les barrages fonctionnent dans les paramètres normaux.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
              </div>
            )}
          </TabsContent>

          {/* Resolved alerts tab */}
          <TabsContent value="resolved">
            <div className="space-y-3">
              {resolvedAlerts.map(ra => {
                return (
                  <Card key={ra.id} className="border shadow-md border-green-500/20 bg-green-500/5">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center bg-green-500/10 flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm">{ra.title}</h3>
                              <p className="text-sm text-muted-foreground mt-0.5">{ra.description}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <Badge variant="outline" className="text-[10px] text-green-500">RÉSOLUE</Badge>
                              <p className="text-[10px] text-muted-foreground mt-1">{ra.resolvedAt}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Config tab */}
          <TabsContent value="config">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Seuils d'alerte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Risque crue : Précipitation</span>
                      <span className="font-semibold">&gt; {floodPrecip} mm</span>
                    </div>
                    <Slider value={[floodPrecip]} min={5} max={50} step={1} onValueChange={v => setFloodPrecip(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Risque crue : Remplissage</span>
                      <span className="font-semibold">&gt; {floodFill}%</span>
                    </div>
                    <Slider value={[floodFill]} min={60} max={98} step={1} onValueChange={v => setFloodFill(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Niveau critique</span>
                      <span className="font-semibold">&lt; {criticalFill}%</span>
                    </div>
                    <Slider value={[criticalFill]} min={5} max={30} step={1} onValueChange={v => setCriticalFill(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span>Stress hydrique : Demande/réserve</span>
                      <span className="font-semibold">&gt; {stressDemand}%</span>
                    </div>
                    <Slider value={[stressDemand]} min={50} max={95} step={5} onValueChange={v => setStressDemand(v[0])} />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Email', desc: 'Alertes critiques par e-mail', value: notifEmail, set: setNotifEmail },
                    { label: 'WebSocket (temps réel)', desc: 'Push au dashboard', value: notifWS, set: setNotifWS },
                    { label: 'SMS', desc: 'Alertes urgentes par SMS', value: notifSMS, set: setNotifSMS },
                  ].map(ch => (
                    <div key={ch.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <Label className="text-sm">{ch.label}</Label>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                      <Switch checked={ch.value} onCheckedChange={ch.set} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
