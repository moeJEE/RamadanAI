import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { DamLevel } from '@/data/types'

interface HistoryChartProps {
  data: DamLevel[]
  damName: string
}

export function HistoryChart({ data, damName }: HistoryChartProps) {
  const chartData = data.map(d => ({
    date: d.date.slice(5), // MM-DD
    fullDate: d.date,
    fill: d.fillPercent != null ? Math.round(d.fillPercent * 100) / 100 : null,
    reserve: d.reserveMm3 != null ? Math.round(d.reserveMm3 * 1000) / 1000 : null,
  })).filter(d => d.fill != null)

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Historique — {damName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée historique disponible.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Historique — 90 jours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value}%`, 'Taux de remplissage']}
                labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.fullDate ?? label}
              />
              <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="5 3" opacity={0.4} label={{ value: '85%', fontSize: 9, fill: '#22c55e' }} />
              <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="5 3" opacity={0.4} label={{ value: '15%', fontSize: 9, fill: '#ef4444' }} />
              <Line
                type="monotone"
                dataKey="fill"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#0ea5e9' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
