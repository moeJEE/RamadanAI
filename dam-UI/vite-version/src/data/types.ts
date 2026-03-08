// ==========================================
// AquaRoute AI — Core Data Types
// ==========================================

export interface DamLevel {
  date: string
  damName: string
  damId: string
  capacityMm3: number
  reserveMm3: number | null
  fillPercent: number | null
}

export interface DamSummary {
  id: string
  name: string
  latestDate: string
  capacityMm3: number
  reserveMm3: number | null
  fillPercent: number | null
  trend7d: number | null  // change in fill% over 7 days
  lat: number | null
  lon: number | null
  basin: string | null
}

export interface WaterNode {
  id: string
  name: string
  type: 'basin' | 'dam' | 'water_complex' | 'treatment_plant' | 'city'
  lat: number | null
  lon: number | null
  provinceRegion: string
  basin: string
  status: string
  sourceNote: string
}

export interface WaterEdge {
  sourceId: string
  targetId: string
  relationType: string
  status: string
  distanceKm: number | null
  note: string
}

export interface HydroResource {
  node: string
  type: 'Dam' | 'Aquifer'
  riverBasin: string
  annualResourceMm3: number | null
  capacityMm3: number | null
  irrigationAreaHa: number | null
  electricityKwh: number | null
  notes: string
  citation: string
}

export interface DailyWeather {
  date: string
  tempMax: number
  tempMin: number
  precipMm: number
  precipHours: number
  et0Mm: number
  windMaxKmh: number
}

export interface WeatherForecast {
  locationName: string
  lat: number
  lon: number
  forecasts: DailyWeather[]
}

export type AlertSeverity = 'critical' | 'warning' | 'info'
export type AlertType = 'flood_risk' | 'critical_low' | 'water_stress' | 'irrigation_peak' | 'transfer_recommended'

export interface WaterAlert {
  id: string
  severity: AlertSeverity
  type: AlertType
  damName: string
  damId: string
  title: string
  description: string
  recommendation: string
  timestamp: string
  fillPercent: number | null
}
