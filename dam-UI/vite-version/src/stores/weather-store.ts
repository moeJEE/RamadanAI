import { create } from 'zustand'
import type { WeatherForecast } from '@/data/types'
import { fetchWeatherForecasts, getWeather7DaySummary } from '@/data/weather'

interface WeatherStore {
  forecasts: WeatherForecast[]
  summary: {
    totalPrecipMm: number
    avgTempMax: number
    avgTempMin: number
    totalEt0Mm: number
    maxPrecipDay: { date: string; mm: number } | null
  }
  loading: boolean
  initialized: boolean
  lastFetched: number | null

  loadWeather: () => Promise<void>
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  forecasts: [],
  summary: { totalPrecipMm: 0, avgTempMax: 0, avgTempMin: 0, totalEt0Mm: 0, maxPrecipDay: null },
  loading: false,
  initialized: false,
  lastFetched: null,

  loadWeather: async () => {
    if (get().initialized) return
    set({ loading: true })
    try {
      const forecasts = await fetchWeatherForecasts()
      const summary = getWeather7DaySummary(forecasts)
      set({ forecasts, summary, initialized: true, lastFetched: Date.now() })
    } catch (err) {
      console.error('Failed to load weather:', err)
    } finally {
      set({ loading: false })
    }
  },
}))
