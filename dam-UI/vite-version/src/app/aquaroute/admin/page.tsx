import { useState } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload, Database, Key, Bell, Activity, CheckCircle, Clock, AlertTriangle, Settings,
} from 'lucide-react'

export default function AdminPage() {
  // Alert thresholds
  const [floodPrecip, setFloodPrecip] = useState(15)
  const [floodFill, setFloodFill] = useState(85)
  const [criticalFill, setCriticalFill] = useState(15)
  const [stressDemand, setStressDemand] = useState(80)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifWS, setNotifWS] = useState(true)
  const [notifSMS, setNotifSMS] = useState(false)

  const logs = [
    { time: '22:30:15', type: 'success', msg: 'Ingestion dam_levels — 8 barrages traités' },
    { time: '22:15:02', type: 'success', msg: 'API Open-Meteo — 4 stations, forecast 7j récupéré' },
    { time: '22:00:01', type: 'info', msg: 'Calcul alertes — 4 alertes actives (2 critiques)' },
    { time: '21:45:10', type: 'warning', msg: 'CSV import — 1 valeur manquante (O. Hassar)' },
    { time: '21:30:00', type: 'success', msg: 'Sync graphe réseau — 15 nœuds, 13 arêtes' },
    { time: '21:00:00', type: 'info', msg: 'Modèle transferts heuristique — 4 recommandations générées' },
  ]

  return (
    <BaseLayout title="Administration" description="Import données, configuration alertes, clés API et logs système">
      <div className="px-4 lg:px-6 space-y-6">

        <Tabs defaultValue="import">
          <TabsList>
            <TabsTrigger value="import"><Upload className="h-3.5 w-3.5 mr-1" /> Import données</TabsTrigger>
            <TabsTrigger value="thresholds"><Bell className="h-3.5 w-3.5 mr-1" /> Seuils alertes</TabsTrigger>
            <TabsTrigger value="api"><Key className="h-3.5 w-3.5 mr-1" /> Clés API</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="h-3.5 w-3.5 mr-1" /> Logs</TabsTrigger>
          </TabsList>

          {/* Import */}
          <TabsContent value="import">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { title: 'CSV Barrages (niveaux)', desc: 'Format: Date, Barrage, Capacité, Réserve, Taux', icon: Database, accept: '.csv', color: 'text-sky-500', bg: 'bg-sky-500/10' },
                { title: 'Données météo (JSON)', desc: 'Payload forecast Open-Meteo (7 jours)', icon: Activity, accept: '.json', color: 'text-violet-500', bg: 'bg-violet-500/10' },
                { title: 'Demande régionale (CSV/JSON)', desc: 'Consommation population, industrie, agriculture', icon: Upload, accept: '.csv,.json', color: 'text-green-500', bg: 'bg-green-500/10' },
                { title: 'Réseau hydraulique (CSV)', desc: 'Nœuds et arêtes du graphe RSK', icon: Settings, accept: '.csv', color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map(item => (
                <Card key={item.title} className="shadow-sm border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${item.bg}`}>
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-sky-500/50 transition-colors cursor-pointer">
                      <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        Glisser-déposer ou <span className="text-sky-500 font-medium">parcourir</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">Accepte : {item.accept}</p>
                    </div>
                    <Button className="w-full mt-3" size="sm" disabled>
                      <Upload className="h-3.5 w-3.5 mr-1" /> Importer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              ⚠️ En Phase 1 (PoC), l'import utilise les CSV locaux. L'ingestion via Kafka/FastAPI sera disponible en Phase 2.
            </p>
          </TabsContent>

          {/* Thresholds */}
          <TabsContent value="thresholds">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Règles d'alerte</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risque crue — Précipitation seuil</span>
                      <span className="font-semibold">&gt; {floodPrecip} mm</span>
                    </div>
                    <Slider value={[floodPrecip]} min={5} max={50} step={1} onValueChange={v => setFloodPrecip(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risque crue — Remplissage seuil</span>
                      <span className="font-semibold">&gt; {floodFill}%</span>
                    </div>
                    <Slider value={[floodFill]} min={60} max={98} step={1} onValueChange={v => setFloodFill(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Niveau critique</span>
                      <span className="font-semibold">&lt; {criticalFill}%</span>
                    </div>
                    <Slider value={[criticalFill]} min={5} max={30} step={1} onValueChange={v => setCriticalFill(v[0])} />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Stress hydrique — Demande vs réserve</span>
                      <span className="font-semibold">&gt; {stressDemand}%</span>
                    </div>
                    <Slider value={[stressDemand]} min={50} max={95} step={5} onValueChange={v => setStressDemand(v[0])} />
                  </div>

                  <Button className="w-full" size="sm" disabled>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Sauvegarder les seuils
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Canaux de notification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Email', desc: 'Alertes critiques par e-mail', value: notifEmail, set: setNotifEmail },
                    { label: 'WebSocket (temps réel)', desc: 'Push alertes au dashboard', value: notifWS, set: setNotifWS },
                    { label: 'SMS', desc: 'Alertes urgentes par SMS', value: notifSMS, set: setNotifSMS },
                  ].map(ch => (
                    <div key={ch.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                      <div>
                        <Label className="text-sm font-medium">{ch.label}</Label>
                        <p className="text-xs text-muted-foreground">{ch.desc}</p>
                      </div>
                      <Switch checked={ch.value} onCheckedChange={ch.set} />
                    </div>
                  ))}

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 mt-4">
                    <strong>Phase 1 :</strong> seules les notifications WebSocket (intégrées au dashboard) sont actives.
                    Email et SMS seront configurables en Phase 2 avec le backend FastAPI.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api">
            <Card className="shadow-sm border max-w-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Configuration des services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Open-Meteo API', key: 'OPEN_METEO_API', defaultVal: 'https://api.open-meteo.com/v1/forecast', status: 'active' },
                  { label: 'Neo4j URI', key: 'NEO4J_URI', defaultVal: '', status: 'planned' },
                  { label: 'Neo4j Password', key: 'NEO4J_PASSWORD', defaultVal: '', status: 'planned' },
                  { label: 'MinIO Endpoint', key: 'MINIO_ENDPOINT', defaultVal: '', status: 'planned' },
                  { label: 'MinIO Access Key', key: 'MINIO_ACCESS_KEY', defaultVal: '', status: 'planned' },
                  { label: 'FastAPI Backend URL', key: 'FASTAPI_URL', defaultVal: '', status: 'planned' },
                ].map(api => (
                  <div key={api.key} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">{api.label}</Label>
                      <Input
                        placeholder={api.defaultVal || `Entrer ${api.label}...`}
                        defaultValue={api.defaultVal}
                        className="h-8 text-xs mt-1"
                        disabled={api.status === 'planned'}
                      />
                    </div>
                    <Badge
                      variant={api.status === 'active' ? 'default' : 'secondary'}
                      className="text-[10px] mt-5"
                    >
                      {api.status === 'active' ? 'Actif' : 'Phase 2'}
                    </Badge>
                  </div>
                ))}

                <Button className="w-full" size="sm" disabled>
                  <Key className="h-3.5 w-3.5 mr-1" /> Sauvegarder
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs */}
          <TabsContent value="logs">
            <Card className="shadow-sm border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Logs système</CardTitle>
                  <Badge variant="outline" className="text-xs">{logs.length} événements</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {logs.map((log, i) => {
                    const Icon = log.type === 'success' ? CheckCircle
                      : log.type === 'warning' ? AlertTriangle : Clock
                    const color = log.type === 'success' ? 'text-green-500'
                      : log.type === 'warning' ? 'text-amber-500' : 'text-sky-500'
                    return (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                        <div className="flex-1">
                          <p className="text-sm">{log.msg}</p>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{log.time}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </BaseLayout>
  )
}
