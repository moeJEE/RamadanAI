import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import type { DamSummary } from '@/data/types'

function getFillColor(pct: number | null): string {
  if (pct == null) return '#6b7280'
  if (pct < 15) return '#ef4444'
  if (pct < 40) return '#f97316'
  if (pct < 65) return '#eab308'
  if (pct < 85) return '#22c55e'
  if (pct < 95) return '#0ea5e9'
  return '#8b5cf6'
}

function getFillLabel(pct: number | null): string {
  if (pct == null) return 'N/A'
  if (pct < 15) return 'Critique'
  if (pct < 40) return 'Bas'
  if (pct < 65) return 'Moyen'
  if (pct < 85) return 'Bon'
  if (pct < 95) return 'Plein'
  return 'Risque crue'
}

export function DamRanking({ dams }: { dams: DamSummary[] }) {
  const navigate = useNavigate()

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Classement des barrages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dams.map((dam, idx) => {
          const fill = dam.fillPercent ?? 0
          const color = getFillColor(dam.fillPercent)

          return (
            <button
              key={dam.id}
              onClick={() => navigate(`/dam/${dam.id}`)}
              className="w-full text-left group"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate group-hover:text-sky-500 transition-colors">
                      {dam.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {dam.trend7d != null && (
                        <span className={`text-xs font-medium ${dam.trend7d > 0 ? 'text-emerald-500' : dam.trend7d < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {dam.trend7d > 0 ? '↑' : dam.trend7d < 0 ? '↓' : '→'} {Math.abs(dam.trend7d).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-sm font-bold tabular-nums" style={{ color }}>
                        {fill.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(fill, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{dam.reserveMm3?.toFixed(1) ?? '-'} Mm³ / {dam.capacityMm3} Mm³</span>
                    <span className="text-[10px] font-medium" style={{ color }}>{getFillLabel(dam.fillPercent)}</span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
