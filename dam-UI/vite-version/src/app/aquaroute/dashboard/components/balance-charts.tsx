import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

// Synthetic 7-day balance data
const balanceData = [
  { day: 'Lun', apports: 4.2, demande: 3.1, evaporation: 0.8 },
  { day: 'Mar', apports: 3.8, demande: 3.3, evaporation: 0.9 },
  { day: 'Mer', apports: 2.1, demande: 3.5, evaporation: 1.0 },
  { day: 'Jeu', apports: 5.8, demande: 3.2, evaporation: 0.7 },
  { day: 'Ven', apports: 14.2, demande: 2.9, evaporation: 0.5 },
  { day: 'Sam', apports: 2.4, demande: 2.7, evaporation: 0.9 },
  { day: 'Dim', apports: 1.8, demande: 3.0, evaporation: 1.1 },
]

const demandData = [
  { name: 'Population', value: 27, color: '#0ea5e9' },
  { name: 'Agriculture', value: 56, color: '#22c55e' },
  { name: 'Industrie', value: 17, color: '#f97316' },
]

export function BalanceChart() {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Balance hydrique — 7 jours</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v} Mm³`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => `${Number(v).toFixed(1)} Mm³`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="apports" stackId="1" stroke="#0ea5e9" fill="#0ea5e940" name="Apports (pluie)" />
              <Area type="monotone" dataKey="demande" stackId="2" stroke="#ef4444" fill="#ef444430" name="Demande" />
              <Area type="monotone" dataKey="evaporation" stackId="3" stroke="#f97316" fill="#f9731620" name="Évaporation" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export function DemandDonut() {
  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Répartition demande</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 260 }} className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={demandData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}%`}
              >
                {demandData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => `${Number(v)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
          {demandData.map(d => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="font-semibold">{d.value}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
