"use client"

import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Sun, Wind, Droplets, CloudSnow, CloudLightning, CloudDrizzle } from 'lucide-react'

// Rabat coordinates
const LAT = 34.0209
const LON = -6.8416

interface CurrentWeather {
  temperature: number
  weathercode: number
  windspeed: number
  humidity: number
  precipitation: number
  time: string
}

interface DailyForecast {
  date: string
  dayName: string
  code: number
  tempMax: number
  tempMin: number
}

function getWeatherIcon(code: number, size = 'h-6 w-6') {
  if (code === 0 || code === 1) return <Sun className={`${size} text-yellow-400`} />
  if (code <= 3) return <Cloud className={`${size} text-gray-400`} />
  if (code <= 49) return <Cloud className={`${size} text-gray-400`} />
  if (code <= 57) return <CloudDrizzle className={`${size} text-blue-400`} />
  if (code <= 67) return <CloudRain className={`${size} text-blue-500`} />
  if (code <= 77) return <CloudSnow className={`${size} text-blue-200`} />
  if (code <= 82) return <CloudRain className={`${size} text-blue-600`} />
  return <CloudLightning className={`${size} text-purple-500`} />
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Ensoleillé'
  if (code === 1) return 'Peu nuageux'
  if (code === 2) return 'Partiellement nuageux'
  if (code === 3) return 'Couvert'
  if (code <= 49) return 'Brumeux'
  if (code <= 57) return 'Bruine'
  if (code <= 67) return 'Pluie'
  if (code <= 77) return 'Neige'
  if (code <= 82) return 'Averses'
  return 'Orage'
}

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']

export function WeatherWidget() {
  const [current, setCurrent] = useState<CurrentWeather | null>(null)
  const [forecast, setForecast] = useState<DailyForecast[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Africa%2FCasablanca&forecast_days=7`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        const c = data.current
        setCurrent({
          temperature: Math.round(c.temperature_2m),
          weathercode: c.weathercode,
          windspeed: Math.round(c.windspeed_10m),
          humidity: c.relative_humidity_2m,
          precipitation: c.precipitation,
          time: c.time,
        })

        const d = data.daily
        const days: DailyForecast[] = d.time.map((dateStr: string, i: number) => {
          const date = new Date(dateStr)
          return {
            date: `${date.getDate()} ${MONTHS_FR[date.getMonth()]}`,
            dayName: i === 0 ? "Auj." : DAYS_FR[date.getDay()],
            code: d.weathercode[i],
            tempMax: Math.round(d.temperature_2m_max[i]),
            tempMin: Math.round(d.temperature_2m_min[i]),
          }
        })
        setForecast(days)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card shadow-lg flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Cloud className="h-8 w-8 animate-pulse" />
          <span className="text-sm">Chargement météo…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-start justify-between">
          {/* Left: current conditions */}
          <div>
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Rabat · Météo en direct</p>
            <div className="flex items-center gap-3">
              {current && getWeatherIcon(current.weathercode, 'h-10 w-10')}
              <span className="text-5xl font-bold tracking-tighter">
                {current?.temperature}°C
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {current ? getWeatherLabel(current.weathercode) : '—'}
            </p>
          </div>

          {/* Right: stats */}
          {current && (
            <div className="flex flex-col gap-2 text-sm text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <CloudRain className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-muted-foreground">Précip.</span>
                <span className="font-medium">{current.precipitation} mm</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Droplets className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-muted-foreground">Humidité</span>
                <span className="font-medium">{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Wind className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-muted-foreground">Vent</span>
                <span className="font-medium">{current.windspeed} km/h</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7-day forecast */}
      <div className="grid grid-cols-7 divide-x divide-border/40">
        {forecast.map((day, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-1.5 px-2 py-4 text-center ${i === 0 ? 'bg-muted/40' : ''}`}
          >
            <span className="text-xs font-semibold text-muted-foreground">{day.dayName}</span>
            <span className="text-[10px] text-muted-foreground/70">{day.date}</span>
            <div className="my-0.5">{getWeatherIcon(day.code, 'h-5 w-5')}</div>
            <span className="text-sm font-semibold">{day.tempMax}°</span>
            <span className="text-xs text-muted-foreground">{day.tempMin}°</span>
          </div>
        ))}
      </div>

    </div>
  )
}
