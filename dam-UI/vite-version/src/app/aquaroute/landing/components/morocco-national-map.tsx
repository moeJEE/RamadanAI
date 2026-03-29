"use client"

import { useEffect, useRef } from 'react'

// Major Moroccan dams — national dataset with real coordinates
const MOROCCO_DAMS = [
  // RSK Region
  { name: 'SMBA',          lat: 34.0209, lon: -6.8416, capacityMm3: 531.8 },
  { name: 'Tamesna',       lat: 34.0331, lon: -6.7985, capacityMm3: 60.0  },
  { name: 'El Mellah',     lat: 34.2610, lon: -6.5802, capacityMm3: 28.0  },
  { name: 'El Himer',      lat: 33.9267, lon: -6.9111, capacityMm3: 45.0  },
  { name: 'Maazer',        lat: 33.8500, lon: -7.0200, capacityMm3: 18.0  },
  { name: 'Zamrine',       lat: 34.3200, lon: -6.4500, capacityMm3: 20.0  },
  { name: 'Ain Kouachia',  lat: 34.1500, lon: -6.6500, capacityMm3: 12.0  },
  // Nord
  { name: 'Al Wahda',           lat: 34.7800, lon: -5.1600, capacityMm3: 3793.0 },
  { name: 'Idriss I',           lat: 34.0833, lon: -4.7500, capacityMm3: 1186.0 },
  { name: 'Mohammed V',         lat: 34.7667, lon: -2.6667, capacityMm3: 730.0  },
  { name: 'Nakhla',             lat: 35.4833, lon: -5.3333, capacityMm3: 22.0   },
  { name: 'Oued El Makhazine',  lat: 35.0833, lon: -5.7333, capacityMm3: 770.0  },
  { name: 'Garde',              lat: 35.0500, lon: -4.9500, capacityMm3: 42.0   },
  { name: 'Bni Mansour',        lat: 34.6000, lon: -4.3167, capacityMm3: 72.0   },
  { name: 'Machkraa',           lat: 34.5000, lon: -4.2000, capacityMm3: 42.0   },
  // Centre-Atlantique
  { name: 'Al Massira',         lat: 32.5167, lon: -7.3167, capacityMm3: 2760.0 },
  { name: 'Imfout',             lat: 33.0500, lon: -8.1667, capacityMm3: 192.0  },
  { name: 'Sidi Said Maachou',  lat: 32.8833, lon: -8.4500, capacityMm3: 25.0   },
  { name: 'Dchar El Oued',      lat: 35.1667, lon: -6.1167, capacityMm3: 71.0   },
  { name: 'Lalla Takerkoust',   lat: 31.5500, lon: -8.2000, capacityMm3: 63.0   },
  // Haut Atlas
  { name: 'Bin El Ouidane',     lat: 32.1167, lon: -6.4500, capacityMm3: 1380.0 },
  { name: 'Moulay Youssef',     lat: 31.9833, lon: -7.1167, capacityMm3: 178.0  },
  { name: 'Hassan II',          lat: 32.6833, lon: -5.0167, capacityMm3: 444.0  },
  { name: 'Aït Aadel',          lat: 32.0500, lon: -6.2500, capacityMm3: 59.0   },
  // Souss-Massa
  { name: 'Abdelmoumen',        lat: 30.7167, lon: -9.2167, capacityMm3: 228.0  },
  { name: 'Aoulouz',            lat: 30.6833, lon: -8.1667, capacityMm3: 245.0  },
  { name: 'Youssef Ben Tachfine', lat: 29.9000, lon: -9.1500, capacityMm3: 285.0 },
  { name: 'Imi El Kheng',       lat: 29.7000, lon: -9.5000, capacityMm3: 14.0   },
  // Draa-Tafilalet
  { name: 'Mansour Eddahbi',    lat: 30.9167, lon: -6.5500, capacityMm3: 560.0  },
  { name: 'Hassan Addakhil',    lat: 31.9500, lon: -4.4167, capacityMm3: 346.0  },
  // Oriental
  { name: 'Mohamed Ben Aouda',  lat: 34.4167, lon: -2.9167, capacityMm3: 434.0  },
  { name: 'Machraa Hammadi',    lat: 34.6667, lon: -3.1167, capacityMm3: 6.0    },
]

function createPinIcon(L: any) {
  return L.divIcon({
    className: '',
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
    html: `
      <div style="
        width:28px; height:28px; border-radius:50%;
        background:#0ea5e9; border:3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        </svg>
      </div>
    `,
  })
}

export function MoroccoNationalMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl

      const map = L.map(mapRef.current!, {
        center: [31.8, -6.0],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      mapInstance.current = map

      // Same OSM tile style as the dashboard
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map)

      const icon = createPinIcon(L)

      MOROCCO_DAMS.forEach((dam) => {
        const marker = L.marker([dam.lat, dam.lon], { icon })
        marker.bindPopup(`
          <div style="font-family:system-ui,sans-serif;min-width:150px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${dam.name}</div>
            <div style="font-size:12px;color:#555">Capacité : <strong style="color:#0ea5e9">${dam.capacityMm3} Mm³</strong></div>
          </div>
        `, { maxWidth: 200 })
        marker.addTo(map)
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
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} style={{ height: '400px', width: '100%' }} />
    </div>
  )
}
