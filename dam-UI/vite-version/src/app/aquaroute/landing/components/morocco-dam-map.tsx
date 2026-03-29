"use client"

import { useEffect, useRef } from 'react'

// Dam locations in the RSK region of Morocco
const dams = [
  { name: 'SMBA', lat: 34.0209, lon: -6.8416, fill: 95.8 },
  { name: 'Tamesna', lat: 34.0331, lon: -6.7985, fill: 83.1 },
  { name: 'El Mellah', lat: 34.2610, lon: -6.5802, fill: 96.3 },
  { name: 'El Himer', lat: 33.9267, lon: -6.9111, fill: 22.2 },
  { name: 'Maazer', lat: 33.8500, lon: -7.0200, fill: 18.0 },
  { name: 'Ain Kouachia', lat: 34.1500, lon: -6.6500, fill: 92.3 },
  { name: 'Zamrine', lat: 34.3200, lon: -6.4500, fill: 0.2 },
]

function getFillColor(fill: number): string {
  if (fill < 15) return '#ef4444'   // red
  if (fill < 40) return '#f97316'   // orange
  if (fill < 65) return '#eab308'   // yellow
  if (fill < 85) return '#22c55e'   // green
  return '#3b82f6'                  // blue
}

export function MoroccoDamMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default icon path issue with Vite
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center: [34.05, -6.85],
        zoom: 9,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      mapInstance.current = map

      // OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      // Add dam markers
      dams.forEach((dam) => {
        const color = getFillColor(dam.fill)
        const marker = L.circleMarker([dam.lat, dam.lon], {
          radius: 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map)

        marker.bindPopup(`
          <div style="font-family:sans-serif;min-width:120px">
            <strong style="font-size:13px">${dam.name}</strong><br/>
            <span style="color:${color};font-weight:600">${dam.fill}% rempli</span>
          </div>
        `)

        marker.bindTooltip(dam.name, { permanent: true, direction: 'top', offset: [0, -10], className: 'dam-tooltip' })
      })
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
      <style>{`
        .dam-tooltip {
          background: rgba(0,0,0,0.75);
          color: #fff;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 6px;
          white-space: nowrap;
        }
        .dam-tooltip::before { display: none; }
      `}</style>
      <div ref={mapRef} style={{ height: '360px', width: '100%' }} />
    </div>
  )
}
