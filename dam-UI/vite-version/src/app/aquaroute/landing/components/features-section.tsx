"use client"

import {
  BarChart3,
  Zap,
  Bot,
  AlertTriangle,
  ArrowRight,
  Network,
  Droplets,
  CloudRain
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { MoroccoNationalMap } from './morocco-national-map'
import { WeatherWidget } from './weather-widget'

const mainFeatures = [
  {
    icon: BarChart3,
    title: 'Prévision de la demande',
    description: 'Modèle LightGBM / LSTM qui prédit la consommation (pop., industrie, agriculture) sur 7 jours.'
  },
  {
    icon: Network,
    title: 'Graphe hydrologique (GNN)',
    description: 'Réseau de barrages modélisé avec PyTorch Geometric pour recommander les transferts optimaux.'
  },
  {
    icon: AlertTriangle,
    title: 'Alertes temps réel',
    description: 'WebSocket push instantané : risque crue, niveau critique, stress hydrique — en moins de 2 min.'
  },
  {
    icon: Bot,
    title: 'Agent IA conversationnel',
    description: 'LangGraph + LLM pour expliquer les recommandations en langage naturel et simuler des scénarios.'
  }
]

const secondaryFeatures = [
  {
    icon: CloudRain,
    title: 'Météo Open-Meteo (7j)',
    description: 'Précipitations, ET0 et vent récupérés automatiquement toutes les 6h pour chaque barrage.'
  },
  {
    icon: Droplets,
    title: 'Bilans hydriques',
    description: 'Calcul automatique : apports − demande − évaporation = tendance nette sur 7 jours.'
  },
  {
    icon: Zap,
    title: 'Simulation de scénarios',
    description: "Mode what-if : simulez une sécheresse, un pic d'irrigation ou une coupure d'interconnexion."
  },
  {
    icon: BarChart3,
    title: 'Dashboard interactif',
    description: 'Carte MapLibre GL, jauges animées, graphiques Recharts — dark mode natif.'
  }
]

export function FeaturesSection() {
  const navigate = useNavigate()

  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Fonctionnalités IA</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Tout ce dont vous avez besoin pour piloter la ressource en eau
          </h2>
          <p className="text-lg text-muted-foreground">
            Un pipeline complet de la donnée météo jusqu'aux recommandations de transfert,
            avec alertes proactives et explicabilité via agent IA.
          </p>
        </div>

        {/* First Feature Block — image left, text right */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 mb-24">
          {/* Left: National Morocco Dam Map — with 3D hover effect */}
          <div className="group relative w-full">
            {/* Animated background glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-all duration-1000 blur-2xl pointer-events-none" />

            {/* Depth shadow layer */}
            <div className="absolute inset-0 translate-y-3 translate-x-2 rounded-2xl bg-gradient-to-br from-primary/10 via-background/40 to-secondary/10 shadow-xl -z-10" />

            {/* Main card */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 transition-all duration-700 ease-out group-hover:[transform:perspective(1000px)_rotateX(3deg)_rotateY(-6deg)_translateZ(8px)]">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
              <MoroccoNationalMap />
              {/* Border highlight */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10 group-hover:ring-primary/40 transition-all duration-500 pointer-events-none" />
            </div>
          </div>

          {/* Right: Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Surveillance en temps réel de tous les barrages
              </h3>
              <p className="text-muted-foreground text-base">
                Visualisez instantanément le taux de remplissage, la réserve en Mm³ et la tendance sur 7 jours
                pour chacun des 8 barrages de la région Rabat-Salé-Kénitra.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {mainFeatures.map((feature, index) => (
                <li key={index} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="cursor-pointer" onClick={() => navigate('/barrages')}>
                Voir les barrages
                <ArrowRight className="ms-2 size-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer" onClick={() => navigate('/alerts')}>
                Voir les alertes
              </Button>
            </div>
          </div>
        </div>

        {/* Second Feature Block — text left, image right */}
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Content */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Données météo et bilans hydriques automatisés
              </h3>
              <p className="text-muted-foreground text-base">
                Open-Meteo fournit 7 jours de prévisions (précipitations, ET0, vent)
                que le système transforme automatiquement en estimations d'apport et de bilan hydrique.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {secondaryFeatures.map((feature, index) => (
                <li key={index} className="group flex items-start gap-3 p-2 rounded-lg hover:bg-accent/5 transition-colors">
                  <div className="mt-0.5 flex shrink-0 items-center justify-center">
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground mt-1 text-sm">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="cursor-pointer" onClick={() => navigate('/meteo')}>
                Météo 7 jours
                <ArrowRight className="ms-2 size-4" aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" className="cursor-pointer" onClick={() => navigate('/simulate')}>
                Simulateur
              </Button>
            </div>
          </div>

          {/* Right: Weather Widget — with 3D hover effect */}
          <div className="order-1 lg:order-2 group relative w-full">
            {/* Animated background glow */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-1000 blur-2xl pointer-events-none" />

            {/* Depth shadow layer */}
            <div className="absolute inset-0 translate-y-3 translate-x-2 rounded-2xl bg-gradient-to-br from-primary/10 via-background/40 to-secondary/10 shadow-xl -z-10" />

            {/* Main card */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 transition-all duration-700 ease-out group-hover:[transform:perspective(1000px)_rotateX(3deg)_rotateY(6deg)_translateZ(8px)]">
              {/* Shimmer sweep */}
              <div className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 translate-x-full group-hover:-translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
              <WeatherWidget />
              {/* Border highlight */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10 group-hover:ring-primary/40 transition-all duration-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
