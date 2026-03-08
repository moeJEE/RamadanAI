import { useEffect } from 'react'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useWeatherStore } from '@/stores/weather-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Cloud, Droplets, Thermometer, Wind, Sun } from 'lucide-react'
import type { WeatherForecast } from '@/data/types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

const STATION_COLORS = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f97316']

function StationCard({ forecast }: { forecast: WeatherForecast }) {
  const totalPrecip = forecast.forecasts.reduce((s, d) => s + d.precipMm, 0)
  const avgTemp = forecast.forecasts.reduce((s, d) => s + (d.tempMax + d.tempMin) / 2, 0) / forecast.forecasts.length
  const totalEt0 = forecast.forecasts.reduce((s, d) => s + d.et0Mm, 0)
  const maxWind = Math.max(...forecast.forecasts.map(d => d.windMaxKmh))

  const chartData = forecast.forecasts.map(d => ({
    date: formatDate(d.date),
    'Précip. (mm)': d.precipMm,
    'ET0 (mm)': Math.round(d.et0Mm * 10) / 10,
    'T. max (°C)': d.tempMax,
    'T. min (°C)': d.tempMin,
  }))

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Cloud className="h-4 w-4 text-sky-500" />
          {forecast.locationName}
          <span className="text-xs text-muted-foreground font-normal ml-1">
            {forecast.lat.toFixed(2)}°N, {forecast.lon.toFixed(2)}°E
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { icon: Droplets, label: 'Précip. 7j', value: `${totalPrecip.toFixed(1)} mm`, color: 'text-sky-500' },
            { icon: Thermometer, label: 'Temp. moy.', value: `${avgTemp.toFixed(1)}°C`, color: 'text-orange-500' },
            { icon: Sun, label: 'ET0 7j', value: `${totalEt0.toFixed(1)} mm`, color: 'text-yellow-500' },
            { icon: Wind, label: 'Vent max', value: `${maxWind.toFixed(0)} km/h`, color: 'text-indigo-400' },
          ].map(kpi => (
            <div key={kpi.label} className="bg-muted/40 rounded-lg p-2">
              <kpi.icon className={`h-4 w-4 mx-auto mb-1 ${kpi.color}`} />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-sm font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Precip + ET0 bar chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                cursor={{ fill: 'hsl(var(--muted))' }}
              />
              <Bar dataKey="Précip. (mm)" fill="#0ea5e9" radius={[3,3,0,0]} isAnimationActive={false} />
              <Bar dataKey="ET0 (mm)" fill="#f97316" radius={[3,3,0,0]} opacity={0.7} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-1 text-muted-foreground font-medium">Jour</th>
                <th className="text-right pb-1 text-muted-foreground font-medium">T.max</th>
                <th className="text-right pb-1 text-muted-foreground font-medium">T.min</th>
                <th className="text-right pb-1 text-muted-foreground font-medium">Pluie</th>
                <th className="text-right pb-1 text-muted-foreground font-medium">ET0</th>
                <th className="text-right pb-1 text-muted-foreground font-medium">Vent</th>
              </tr>
            </thead>
            <tbody>
              {forecast.forecasts.map(d => (
                <tr key={d.date} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-1 font-medium">{formatDate(d.date)}</td>
                  <td className="py-1 text-right text-orange-500 font-medium">{d.tempMax}°</td>
                  <td className="py-1 text-right text-sky-500 font-medium">{d.tempMin}°</td>
                  <td className="py-1 text-right">
                    {d.precipMm > 0
                      ? <span className="text-sky-500 font-semibold">{d.precipMm} mm</span>
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-1 text-right text-muted-foreground">{d.et0Mm.toFixed(1)}</td>
                  <td className="py-1 text-right text-muted-foreground">{d.windMaxKmh.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MeteoPage() {
  const { forecasts, summary, loading, loadWeather } = useWeatherStore()

  useEffect(() => { loadWeather() }, [loadWeather])

  return (
    <BaseLayout
      title="Météo"
      description="Prévisions 7 jours — 4 stations RSK · Source Open-Meteo API"
    >
      <div className="px-4 lg:px-6 space-y-6">

        {/* Global summary */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Précip. cumulée', value: `${summary.totalPrecipMm} mm`, icon: Droplets, color: 'text-sky-500', bg: 'bg-sky-500/10' },
            { label: 'Temp. moy. max', value: `${summary.avgTempMax}°C`, icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Temp. moy. min', value: `${summary.avgTempMin}°C`, icon: Thermometer, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: 'ET0 cumulée', value: `${summary.totalEt0Mm} mm`, icon: Sun, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          ].map(kpi => (
            <Card key={kpi.label} className="@container/card shadow-sm border">
              <CardHeader>
                <CardDescription>{kpi.label}</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {kpi.value}
                </CardTitle>
                <CardAction>
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>

        {summary.maxPrecipDay && (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-600 dark:text-sky-400">
            <strong>Pic de pluie prévu :</strong> {summary.maxPrecipDay.mm} mm le {formatDate(summary.maxPrecipDay.date)} (moyenne des 4 stations)
          </div>
        )}

        {/* Comparative precip chart */}
        {forecasts.length > 0 && (() => {
          const dates = forecasts[0].forecasts.map(d => formatDate(d.date))
          const chartData = dates.map((date, i) => {
            const obj: Record<string, number | string> = { date }
            forecasts.forEach(f => { obj[f.locationName] = f.forecasts[i].precipMm })
            return obj
          })
          return (
            <Card className="shadow-sm border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Précipitations comparées — 4 stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {forecasts.map((f, idx) => (
                        <Bar key={f.locationName} dataKey={f.locationName} fill={STATION_COLORS[idx % 4]} radius={[3,3,0,0]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Station cards */}
        {loading && forecasts.length === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {forecasts.map(f => <StationCard key={f.locationName} forecast={f} />)}
          </div>
        )}
      </div>
    </BaseLayout>
  )
}
