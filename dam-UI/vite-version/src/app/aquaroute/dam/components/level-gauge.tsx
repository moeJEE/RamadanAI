import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  if (pct == null) return 'Données manquantes'
  if (pct < 15) return 'Niveau critique ⚠️'
  if (pct < 40) return 'Niveau bas'
  if (pct < 65) return 'Niveau moyen'
  if (pct < 85) return 'Bon niveau'
  if (pct < 95) return 'Quasi plein'
  return 'Risque débordement ⚠️'
}

interface LevelGaugeProps {
  name: string
  fillPercent: number | null
  reserveMm3: number | null
  capacityMm3: number
}

export function LevelGauge({ name, fillPercent, reserveMm3, capacityMm3 }: LevelGaugeProps) {
  const fill = fillPercent ?? 0
  const color = getFillColor(fillPercent)
  const label = getFillLabel(fillPercent)

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Jauge de niveau</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center py-6">
        {/* SVG Gauge */}
        <svg viewBox="0 0 200 240" className="w-48 h-auto">
          {/* Tank outline */}
          <rect x="30" y="20" width="140" height="180" rx="12" ry="12"
            fill="none" stroke="hsl(var(--border))" strokeWidth="2" />

          {/* Fill */}
          <defs>
            <clipPath id="tank-clip">
              <rect x="32" y="22" width="136" height="176" rx="10" ry="10" />
            </clipPath>
            <linearGradient id="tank-fill-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>

          <g clipPath="url(#tank-clip)">
            {/* Water fill */}
            <rect
              x="32"
              y={22 + 176 * (1 - Math.min(fill, 100) / 100)}
              width="136"
              height={176 * Math.min(fill, 100) / 100}
              fill="url(#tank-fill-gradient)"
            >
              <animate
                attributeName="y"
                from="198"
                to={22 + 176 * (1 - Math.min(fill, 100) / 100)}
                dur="1.2s"
                fill="freeze"
              />
              <animate
                attributeName="height"
                from="0"
                to={176 * Math.min(fill, 100) / 100}
                dur="1.2s"
                fill="freeze"
              />
            </rect>

            {/* Water surface wave */}
            {fill > 2 && (
              <path
                d={`M 32 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 60 ${22 + 176 * (1 - Math.min(fill, 100) / 100) - 4} 100 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 140 ${22 + 176 * (1 - Math.min(fill, 100) / 100) + 4} 168 ${22 + 176 * (1 - Math.min(fill, 100) / 100)}`}
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                opacity="0.4"
              >
                <animate
                  attributeName="d"
                  values={
                    `M 32 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 60 ${22 + 176 * (1 - Math.min(fill, 100) / 100) - 4} 100 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 140 ${22 + 176 * (1 - Math.min(fill, 100) / 100) + 4} 168 ${22 + 176 * (1 - Math.min(fill, 100) / 100)};` +
                    `M 32 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 60 ${22 + 176 * (1 - Math.min(fill, 100) / 100) + 4} 100 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 140 ${22 + 176 * (1 - Math.min(fill, 100) / 100) - 4} 168 ${22 + 176 * (1 - Math.min(fill, 100) / 100)};` +
                    `M 32 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 60 ${22 + 176 * (1 - Math.min(fill, 100) / 100) - 4} 100 ${22 + 176 * (1 - Math.min(fill, 100) / 100)} Q 140 ${22 + 176 * (1 - Math.min(fill, 100) / 100) + 4} 168 ${22 + 176 * (1 - Math.min(fill, 100) / 100)}`
                  }
                  dur="3s"
                  repeatCount="indefinite"
                />
              </path>
            )}
          </g>

          {/* Percentage text */}
          <text x="100" y="120" textAnchor="middle" fontSize="28" fontWeight="bold" fill={color}>
            {fill.toFixed(1)}%
          </text>

          {/* Capacity text */}
          <text x="100" y="222" textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))">
            {reserveMm3?.toFixed(1) ?? '?'} / {capacityMm3} Mm³
          </text>
        </svg>

        {/* Status label */}
        <p className="mt-3 text-sm font-medium" style={{ color }}>{label}</p>
      </CardContent>
    </Card>
  )
}
