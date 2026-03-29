"use client"

import { useEffect, useRef } from 'react'

export function WeatherMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    import('leaflet').then((L) => {
      const map = L.map(mapRef.current!, {
        center: [34.05, -6.85],
        zoom: 7,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      mapInstance.current = map

      // Base map — CartoDB Positron (light, minimal)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(map)

      // OpenWeatherMap precipitation layer (set VITE_OWM_API_KEY in .env to activate)
      const owmKey = import.meta.env.VITE_OWM_API_KEY
      if (owmKey) {
        L.tileLayer(
          `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmKey}`,
          {
            attribution: '© <a href="https://openweathermap.org/">OpenWeatherMap</a>',
            opacity: 0.6,
            maxZoom: 18,
          }
        ).addTo(map)
      }

      // Add RSK region bounding box highlight
      L.rectangle(
        [[33.5, -7.5], [34.6, -5.8]],
        {
          color: '#3b82f6',
          weight: 1.5,
          fillColor: '#3b82f6',
          fillOpacity: 0.05,
          dashArray: '6 4',
        }
      ).addTo(map).bindPopup('<strong>Région RSK</strong><br/>Rabat-Salé-Kénitra')

      // Label marker at center of region
      L.marker([34.05, -6.75], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:rgba(59,130,246,0.9);color:#fff;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap">Région RSK</div>`,
          iconAnchor: [40, 12],
        })
      }).addTo(map)
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ height: '360px', width: '100%' }} />
    </div>
  )
}
