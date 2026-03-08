import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { WeatherForecast } from '@/data/types'
import { CloudRain, Sun, CloudSun } from 'lucide-react'

interface WeatherTableProps {
  forecasts: WeatherForecast[]
}

function getWeatherIcon(precipMm: number) {
  if (precipMm > 5) return <CloudRain className="h-4 w-4 text-sky-500" />
  if (precipMm > 0) return <CloudSun className="h-4 w-4 text-amber-500" />
  return <Sun className="h-4 w-4 text-yellow-500" />
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

export function WeatherTable({ forecasts }: WeatherTableProps) {
  if (forecasts.length === 0) {
    return (
      <Card className="shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Prévisions météo — 7 jours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement des données météo...</p>
        </CardContent>
      </Card>
    )
  }

  // Average across all locations for each day
  const numLocs = forecasts.length
  const days = forecasts[0].forecasts.map((day, idx) => ({
    date: day.date,
    tempMax: Math.round(forecasts.reduce((s, f) => s + f.forecasts[idx].tempMax, 0) / numLocs * 10) / 10,
    tempMin: Math.round(forecasts.reduce((s, f) => s + f.forecasts[idx].tempMin, 0) / numLocs * 10) / 10,
    precipMm: Math.round(forecasts.reduce((s, f) => s + f.forecasts[idx].precipMm, 0) / numLocs * 10) / 10,
    et0Mm: Math.round(forecasts.reduce((s, f) => s + f.forecasts[idx].et0Mm, 0) / numLocs * 10) / 10,
    windMaxKmh: Math.round(forecasts.reduce((s, f) => s + f.forecasts[idx].windMaxKmh, 0) / numLocs * 10) / 10,
  }))

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Prévisions météo — 7 jours (moyenne RSK)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Jour</TableHead>
                <TableHead className="text-xs text-center"></TableHead>
                <TableHead className="text-xs text-right">Temp.</TableHead>
                <TableHead className="text-xs text-right">Pluie</TableHead>
                <TableHead className="text-xs text-right">ET0</TableHead>
                <TableHead className="text-xs text-right">Vent max</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map(day => (
                <TableRow key={day.date}>
                  <TableCell className="text-xs font-medium">{formatDate(day.date)}</TableCell>
                  <TableCell className="text-center">{getWeatherIcon(day.precipMm)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    <span className="text-orange-500">{day.tempMax}°</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-sky-500">{day.tempMin}°</span>
                  </TableCell>
                  <TableCell className={`text-xs text-right tabular-nums ${day.precipMm > 5 ? 'text-sky-500 font-semibold' : ''}`}>
                    {day.precipMm} mm
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums text-amber-500">
                    {day.et0Mm} mm
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums">
                    {day.windMaxKmh} km/h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Source : Open-Meteo API · Moyenne de 4 stations de la région RSK</p>
      </CardContent>
    </Card>
  )
}
