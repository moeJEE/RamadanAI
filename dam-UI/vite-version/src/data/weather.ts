import type { WeatherForecast, DailyWeather } from './types'

const WEATHER_POINTS = [
  { name: 'Rabat', lat: 34.0209, lon: -6.8416 },
  { name: 'Salé', lat: 34.0331, lon: -6.7985 },
  { name: 'Kénitra', lat: 34.2610, lon: -6.5802 },
  { name: 'Témara', lat: 33.9267, lon: -6.9111 },
]

const CACHE_DURATION_MS = 15 * 60 * 1000 // 15 minutes
let _cache: { data: WeatherForecast[]; timestamp: number } | null = null

export async function fetchWeatherForecasts(): Promise<WeatherForecast[]> {
  // Return cache if valid
  if (_cache && Date.now() - _cache.timestamp < CACHE_DURATION_MS) {
    return _cache.data
  }

  const lats = WEATHER_POINTS.map(p => p.lat).join(',')
  const lons = WEATHER_POINTS.map(p => p.lon).join(',')

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,et0_fao_evapotranspiration,wind_speed_10m_max&forecast_days=7&timezone=auto`

  try {
    const res = await fetch(url)
    const json = await res.json()

    const results: WeatherForecast[] = (Array.isArray(json) ? json : [json]).map(
      (loc: any, idx: number) => {
        const point = WEATHER_POINTS[idx]
        const daily = loc.daily

        const forecasts: DailyWeather[] = daily.time.map((date: string, i: number) => ({
          date,
          tempMax: daily.temperature_2m_max[i],
          tempMin: daily.temperature_2m_min[i],
          precipMm: daily.precipitation_sum[i],
          precipHours: daily.precipitation_hours[i],
          et0Mm: daily.et0_fao_evapotranspiration[i],
          windMaxKmh: daily.wind_speed_10m_max[i],
        }))

        return {
          locationName: point.name,
          lat: point.lat,
          lon: point.lon,
          forecasts,
        }
      }
    )

    _cache = { data: results, timestamp: Date.now() }
    return results
  } catch (err) {
    console.error('Failed to fetch weather data:', err)
    if (_cache) return _cache.data
    return []
  }
}

export function getWeather7DaySummary(forecasts: WeatherForecast[]): {
  totalPrecipMm: number
  avgTempMax: number
  avgTempMin: number
  totalEt0Mm: number
  maxPrecipDay: { date: string; mm: number } | null
} {
  if (forecasts.length === 0) return { totalPrecipMm: 0, avgTempMax: 0, avgTempMin: 0, totalEt0Mm: 0, maxPrecipDay: null }

  // Average across all locations
  const allDays = forecasts.flatMap(f => f.forecasts)
  const numDays = forecasts[0].forecasts.length
  const numLocs = forecasts.length

  const totalPrecipMm = Math.round(allDays.reduce((s, d) => s + d.precipMm, 0) / numLocs * 10) / 10
  const avgTempMax = Math.round(allDays.reduce((s, d) => s + d.tempMax, 0) / allDays.length * 10) / 10
  const avgTempMin = Math.round(allDays.reduce((s, d) => s + d.tempMin, 0) / allDays.length * 10) / 10
  const totalEt0Mm = Math.round(allDays.reduce((s, d) => s + d.et0Mm, 0) / numLocs * 10) / 10

  // Find max precip day (averaged across locations)
  const dayPrecips: { date: string; mm: number }[] = []
  for (let i = 0; i < numDays; i++) {
    const avgPrecip = forecasts.reduce((s, f) => s + f.forecasts[i].precipMm, 0) / numLocs
    dayPrecips.push({ date: forecasts[0].forecasts[i].date, mm: Math.round(avgPrecip * 10) / 10 })
  }

  const maxPrecipDay = dayPrecips.reduce((max, d) => d.mm > max.mm ? d : max, dayPrecips[0])

  return { totalPrecipMm, avgTempMax, avgTempMin, totalEt0Mm, maxPrecipDay: maxPrecipDay.mm > 0 ? maxPrecipDay : null }
}
