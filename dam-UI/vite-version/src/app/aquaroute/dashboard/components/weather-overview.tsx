import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { WeatherForecast } from '@/data/types'
import { CloudRain, Thermometer, Wind, Droplets } from 'lucide-react'

interface WeatherOverviewProps {
  forecasts: WeatherForecast[]
  summary: {
    totalPrecipMm: number
    avgTempMax: number
    avgTempMin: number
    totalEt0Mm: number
    maxPrecipDay: { date: string; mm: number } | null
  }
}

export function WeatherOverview({ forecasts, summary }: WeatherOverviewProps) {
  if (forecasts.length === 0) {
    return (
      <Card className="shadow-sm border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Météo 7 jours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement des données météo...</p>
        </CardContent>
      </Card>
    )
  }

  // Average precip per day across all locations  
  const dailyData = forecasts[0].forecasts.map((day, idx) => {
    const avgPrecip = forecasts.reduce((s, f) => s + f.forecasts[idx].precipMm, 0) / forecasts.length
    const avgTemp = forecasts.reduce((s, f) => s + (f.forecasts[idx].tempMax + f.forecasts[idx].tempMin) / 2, 0) / forecasts.length
    return {
      date: day.date.slice(5), // MM-DD
      precip: Math.round(avgPrecip * 10) / 10,
      temp: Math.round(avgTemp * 10) / 10,
    }
  })

  return (
    <Card className="shadow-sm border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Météo 7 jours — RSK</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <CloudRain className="h-4 w-4 text-sky-500" />
            <div>
              <p className="text-xs text-muted-foreground">Précip. cumulée</p>
              <p className="font-semibold">{summary.totalPrecipMm} mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <div>
              <p className="text-xs text-muted-foreground">Temp. moyenne</p>
              <p className="font-semibold">{summary.avgTempMin}–{summary.avgTempMax}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Droplets className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">ET0 cumulée</p>
              <p className="font-semibold">{summary.totalEt0Mm} mm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wind className="h-4 w-4 text-teal-500" />
            <div>
              <p className="text-xs text-muted-foreground">Max pluie/jour</p>
              <p className="font-semibold">
                {summary.maxPrecipDay ? `${summary.maxPrecipDay.mm} mm` : '0 mm'}
              </p>
            </div>
          </div>
        </div>

        {/* Precip bar chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(value: number, name: string) => [
                  `${value} ${name === 'precip' ? 'mm' : '°C'}`,
                  name === 'precip' ? 'Précipitation' : 'Température'
                ]}
              />
              <Bar dataKey="precip" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Source */}
        <p className="text-[10px] text-muted-foreground">Source : Open-Meteo API · 4 stations RSK</p>
      </CardContent>
    </Card>
  )
}
