import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ReserveChartProps {
  history: { date: string; total: number }[]
}

export function ReserveChart({ history }: ReserveChartProps) {
  const chartData = history.map(h => ({
    date: h.date.slice(5), // MM-DD
    fullDate: h.date,
    total: Math.round(h.total * 10) / 10,
  }))

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Réserve totale — 90 jours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}`}
                domain={['dataMin - 20', 'dataMax + 20']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} Mm³`, 'Réserve totale']}
                labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.fullDate ?? label}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#waterGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#0ea5e9' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
