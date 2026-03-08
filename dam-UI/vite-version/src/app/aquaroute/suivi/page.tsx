import { BaseLayout } from '@/components/layouts/base-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Activity, ArrowRight, Droplets, Timer, CheckCircle } from 'lucide-react'
import { useTransferStore } from '@/stores/transfer-store'

export default function SuiviPage() {
  const { activeTransfers } = useTransferStore()
  
  const inProgress = activeTransfers.filter(t => t.status !== 'completed').length
  const completed = activeTransfers.filter(t => t.status === 'completed').length

  return (
    <BaseLayout
      title="Supervision Globale des Pompages"
      description="Tableau de bord de suivi du réseau d'interconnexion en temps réel"
    >
      <div className="px-4 lg:px-6 space-y-6 pb-10">
        <div className="flex gap-4">
          <Card className="flex-1 shadow-sm border">
            <CardHeader className="py-4 flex-row items-center justify-between">
              <div>
                <CardDescription>Opérations Actives</CardDescription>
                <CardTitle className="text-3xl mt-1 text-sky-500">{inProgress}</CardTitle>
              </div>
              <Activity className="h-8 w-8 text-sky-500 opacity-20" />
            </CardHeader>
          </Card>
          <Card className="flex-1 shadow-sm border">
            <CardHeader className="py-4 flex-row items-center justify-between">
              <div>
                <CardDescription>Terminées avec Succès</CardDescription>
                <CardTitle className="text-3xl mt-1 text-emerald-500">{completed}</CardTitle>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500 opacity-20" />
            </CardHeader>
          </Card>
        </div>

        {activeTransfers.length === 0 ? (
          <Card className="shadow-sm border">
            <CardContent className="py-16 flex flex-col items-center justify-center text-center">
              <Activity className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-medium">Aucun pompage en cours</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-3">
                Initiez de nouveaux transferts depuis le moteur heuristique de la page "Transferts" pour voir la chronologie et la progression s'afficher ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {activeTransfers.map((t, i) => (
              <Card key={`${t.id}-${i}`} className={`border shadow-md relative overflow-hidden ${t.status === 'completed' ? 'border-emerald-500/20' : 'border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.1)] ring-1 ring-sky-500/10'}`}>
                 <div 
                   className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear z-0 ${t.status === 'completed' ? 'bg-emerald-500/5' : 'bg-sky-500/5'}`}
                   style={{ width: `${t.progress}%` }}
                 />
                 
                 <CardContent className="relative z-10 p-6">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={t.status === 'completed' ? 'default' : 'outline'} className={t.status === 'completed' ? 'bg-green-500 px-3' : 'text-sky-500 border-sky-500/30 bg-sky-500/10 border px-3'}>
                            {t.status === 'completed' ? 'Terminé' : t.status === 'starting' ? 'Amorçage pompes...' : 'Pompage en cours'}
                          </Badge>
                          <span className="text-lg font-bold">{t.from.name} <ArrowRight className="inline h-4 w-4 text-muted-foreground mx-1"/> {t.to.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">ID Opération : {t.id} — Volume : {t.volumeMm3} Mm³ — Moteur : {t.energyCostKwh.toFixed(0)} kWh</p>
                      </div>
                      
                      <div className="text-right">
                         <div className={`text-4xl font-mono font-bold ${t.status === 'completed' ? 'text-emerald-500' : 'text-sky-500'}`}>
                           {t.progress.toFixed(0)}<span className="text-2xl opacity-50">%</span>
                         </div>
                         <div className="text-sm font-mono text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                            <Droplets className={`h-4 w-4 ${t.status === 'completed' ? 'text-emerald-400' : 'text-sky-400'}`} />
                            {t.status === 'completed' ? '0.0' : t.flowRate.toFixed(1)} m³/s
                         </div>
                      </div>
                   </div>
                   
                   <Progress value={t.progress} className={`h-4 rounded-full bg-muted/60 ${t.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-950/40' : ''}`} />
                   
                   <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground font-mono">
                      <span>0 Mm³</span>
                      <span className="flex items-center gap-1.5 font-medium">
                        {t.status !== 'completed' && <Timer className="h-4 w-4 opacity-70" />}
                        {t.status === 'completed' ? (
                          <span className="flex items-center gap-1 font-bold text-emerald-500"><CheckCircle className="h-4 w-4" /> Transfert clôturé avec succès.</span>
                        ) : `Fin estimée : dans ${Math.round((100 - t.progress) * 1.5)} minutes`}
                      </span>
                      <span>{t.volumeMm3} Mm³</span>
                   </div>
                 </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
