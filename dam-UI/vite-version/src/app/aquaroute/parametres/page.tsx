import { BaseLayout } from '@/components/layouts/base-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Server, Database, Cloud, GitBranch, Cpu, Droplets,
  CheckCircle, Circle, Clock,
} from 'lucide-react'

const STACK = [
  {
    category: 'Frontend',
    icon: Cpu, color: 'text-sky-500', bg: 'bg-sky-500/10',
    items: [
      { name: 'React 18 + TypeScript', status: 'active', note: 'UI principale' },
      { name: 'Vite 7', status: 'active', note: 'Bundler / dev server' },
      { name: 'Tailwind CSS v4', status: 'active', note: 'Styling system' },
      { name: 'shadcn/ui + Radix UI', status: 'active', note: 'Composants UI' },
      { name: 'Leaflet + react-leaflet', status: 'active', note: 'Cartographie interactive' },
      { name: 'Recharts', status: 'active', note: 'Graphiques & visualisations' },
      { name: 'Zustand', status: 'active', note: 'State management' },
    ],
  },
  {
    category: 'APIs & Données',
    icon: Cloud, color: 'text-violet-500', bg: 'bg-violet-500/10',
    items: [
      { name: 'Open-Meteo API', status: 'active', note: 'Prévisions météo 7j (4 stations RSK)' },
      { name: 'CSV Barrages RSK', status: 'active', note: 'Données historiques niveaux' },
      { name: 'CSV Nœuds / Arêtes RSK', status: 'active', note: 'Réseau hydraulique' },
      { name: 'FastAPI (backend PoC)', status: 'planned', note: 'Endpoints ingestion — phase 2' },
    ],
  },
  {
    category: 'Infrastructure (Phase 2)',
    icon: Server, color: 'text-green-500', bg: 'bg-green-500/10',
    items: [
      { name: 'Apache Kafka / Redpanda', status: 'planned', note: 'Streaming temps réel' },
      { name: 'MinIO', status: 'planned', note: 'Stockage raw / Delta Lake' },
      { name: 'Apache Spark', status: 'planned', note: 'ETL & Feature engineering' },
    ],
  },
  {
    category: 'IA & Modèles (Phase 3)',
    icon: GitBranch, color: 'text-orange-500', bg: 'bg-orange-500/10',
    items: [
      { name: 'LightGBM (demand predictor)', status: 'planned', note: 'Prévision demande multi-output' },
      { name: 'PyTorch Geometric (GNN)', status: 'planned', note: 'Modèle graphe transferts' },
      { name: 'Neo4j', status: 'planned', note: 'Graphe hydraulique + GDS' },
      { name: 'MLflow', status: 'planned', note: 'Tracking expériences' },
      { name: 'LangGraph Agent', status: 'planned', note: 'Agent explicatif IA' },
    ],
  },
  {
    category: 'Données & Base RSK',
    icon: Database, color: 'text-rose-500', bg: 'bg-rose-500/10',
    items: [
      { name: '8 barrages suivis', status: 'active', note: 'SMBA, Tamesna, El Mellah, El Himer, Maazer, O. Hassar, Ain Kouachia, Zamrine' },
      { name: '4 stations météo', status: 'active', note: 'Rabat, Salé, Kénitra, Témara' },
      { name: 'Données de demande synthétiques', status: 'planned', note: 'Population / industrie / agriculture' },
    ],
  },
]

const STATUS_DISPLAY = {
  active:  { icon: CheckCircle, label: 'Actif',   color: 'text-green-500' },
  planned: { icon: Clock,       label: 'Planifié', color: 'text-amber-500' },
  partial: { icon: Circle,      label: 'Partiel',  color: 'text-sky-500' },
}

export default function ParametresPage() {
  return (
    <BaseLayout
      title="Paramètres & Architecture"
      description="Stack technique et feuille de route PoC — AquaRoute AI"
    >
      <div className="px-4 lg:px-6 space-y-6">

        {/* Project overview */}
        <Card className="shadow-sm border">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Droplets className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">AquaRoute AI — PoC v0.1</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Système de gestion prédictive de l'eau pour la région Rabat-Salé-Kénitra.
                  Combine données barrages, prévisions météo, modélisation de graphe et optimisation des transferts.
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    { label: 'Région RSK', variant: 'outline' as const },
                    { label: 'PoC v0.1', variant: 'secondary' as const },
                    { label: 'Open-Meteo', variant: 'outline' as const },
                    { label: 'Leaflet Maps', variant: 'outline' as const },
                    { label: 'GNN (Phase 3)', variant: 'secondary' as const },
                  ].map(b => (
                    <Badge key={b.label} variant={b.variant} className="text-xs">{b.label}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roadmap */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Feuille de route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { phase: 'Phase 1 (Actuel)', label: 'Frontend PoC', desc: 'Dashboard, Carte, Alertes, Météo, Barrages, Réseau, Transferts heusristiques', status: 'active' },
                { phase: 'Phase 2', label: 'Backend & Ingestion', desc: 'FastAPI + Kafka + MinIO + ETL Spark Delta', status: 'planned' },
                { phase: 'Phase 3', label: 'Modèles IA', desc: 'LightGBM demand, GNN transferts, Neo4j, MLflow, Agent LangGraph', status: 'planned' },
                { phase: 'Phase 4', label: 'Production', desc: 'Auth, multi-région, API publique, alertes temps réel', status: 'planned' },
              ].map(p => {
                const s = STATUS_DISPLAY[p.status as keyof typeof STATUS_DISPLAY]
                return (
                  <div key={p.phase} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                    <s.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${s.color}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{p.phase}</span>
                        <Badge variant="outline" className="text-[10px]">{s.label}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stack cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {STACK.map(section => (
            <Card key={section.category} className="shadow-sm border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${section.bg}`}>
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                  </div>
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.items.map(item => {
                  const s = STATUS_DISPLAY[item.status as keyof typeof STATUS_DISPLAY]
                  return (
                    <div key={item.name} className="flex items-start gap-2">
                      <s.icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${s.color}`} />
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.note}</p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Data model */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Schéma de données (PoC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              {[
                {
                  table: 'dam_levels', color: 'border-sky-500/30',
                  fields: ['date', 'dam_id', 'capacity_m3', 'reserve_m3', 'fill_pct'],
                },
                {
                  table: 'weather_forecast', color: 'border-violet-500/30',
                  fields: ['dam_id', 'date', 'precip_mm', 'temp_mean', 'et0_mm', 'wind_kmh'],
                },
                {
                  table: 'demand_base (phase 2)', color: 'border-amber-500/30',
                  fields: ['region_id', 'date', 'pop_daily_m3', 'industry_m3', 'agri_m3'],
                },
              ].map(t => (
                <div key={t.table} className={`rounded-lg border ${t.color} p-3`}>
                  <p className="font-bold mb-2 text-foreground">{t.table}</p>
                  {t.fields.map(f => (
                    <p key={f} className="text-muted-foreground">· {f}</p>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BaseLayout>
  )
}
