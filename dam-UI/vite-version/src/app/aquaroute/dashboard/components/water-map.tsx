import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DamSummary, WaterAlert } from '@/data/types'

// Fix default icon paths broken by bundlers
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function getFillColor(pct: number | null): string {
  if (pct == null) return '#6b7280'
  if (pct < 15) return '#ef4444'
  if (pct < 40) return '#f97316'
  if (pct < 65) return '#eab308'
  if (pct < 85) return '#22c55e'
  if (pct < 95) return '#0ea5e9'
  return '#8b5cf6'
}

function getFillLabel(pct: number | null): string {
  if (pct == null) return 'Inconnu'
  if (pct < 15) return 'Critique'
  if (pct < 40) return 'Bas'
  if (pct < 65) return 'Moyen'
  if (pct < 85) return 'Bon'
  if (pct < 95) return 'Élevé'
  return 'Très élevé'
}

function createDamIcon(color: string, hasAlert: boolean): L.DivIcon {
  const pulse = hasAlert
    ? `<span style="
        position:absolute; inset:-6px; border-radius:50%;
        border:2px solid #ef4444; opacity:0.6;
        animation: dam-pulse 1.8s ease-in-out infinite;
      "></span>`
    : ''

  return L.divIcon({
    className: '',
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
    html: `
      <div style="position:relative; width:36px; height:36px;">
        ${pulse}
        <div style="
          width:36px; height:36px; border-radius:50%;
          background:${color}; border:3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display:flex; align-items:center; justify-content:center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      </div>
    `,
  })
}



interface WaterMapProps {
  dams: DamSummary[]
  alerts: WaterAlert[]
  showHeader?: boolean
  showLegend?: boolean
  showDetailButton?: boolean
  showAttribution?: boolean
}

export function WaterMap({ dams, alerts, showHeader = true, showLegend = true, showDetailButton = true, showAttribution = true }: WaterMapProps) {
  const navigate = useNavigate()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [34.00, -6.85],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: showAttribution,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map)

    // Add a subtle region bounding rectangle for RSK
    L.rectangle(
      [[33.3, -7.4], [34.8, -5.4]],
      { color: '#0ea5e9', weight: 1.5, fillOpacity: 0.04, dashArray: '6 4' }
    ).addTo(map)

    // RSK label
    L.marker([34.65, -7.2], {
      icon: L.divIcon({
        className: '',
        html: `<div style="
          background:rgba(14,165,233,0.15); border:1px solid #0ea5e950;
          border-radius:6px; padding:2px 8px;
          font-size:11px; font-weight:600; color:#0ea5e9;
          white-space:nowrap; backdrop-filter:blur(4px);
        ">Rabat-Salé-Kénitra</div>`,
      }),
    }).addTo(map)

    mapRef.current = map

    // Inject pulse animation keyframes
    const style = document.createElement('style')
    style.textContent = `
      @keyframes dam-pulse {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50%       { transform: scale(1.6); opacity: 0.1; }
      }
    `
    document.head.appendChild(style)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update markers when dams/alerts change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove old markers
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    dams.forEach(dam => {
      // Strictly use actual backend API coordinates
      const coords = dam.lat && dam.lon ? { lat: dam.lat, lon: dam.lon } : null
      if (!coords) return

      const color = getFillColor(dam.fillPercent)
      const damAlerts = alerts.filter(a => a.damId === dam.id)
      const hasAlert = damAlerts.length > 0
      const icon = createDamIcon(color, hasAlert)

      const marker = L.marker([coords.lat, coords.lon], { icon })

      const pct = dam.fillPercent != null ? dam.fillPercent.toFixed(1) + '%' : '—'
      const reserveText = dam.reserveMm3 != null ? dam.reserveMm3.toFixed(1) + ' Mm³' : '—'
      const capText = dam.capacityMm3 != null ? dam.capacityMm3.toFixed(0) + ' Mm³' : '—'
      
      let alertBadge = ''
      if (hasAlert) {
        const hasCritical = damAlerts.some(a => a.severity === 'critical')
        const hasWarning = damAlerts.some(a => a.severity === 'warning')
        const alertColor = hasCritical ? '#ef4444' : hasWarning ? '#f97316' : '#0ea5e9'
        const bgAlert = hasCritical ? '#ef444420' : hasWarning ? '#f9731620' : '#0ea5e920'
        
        alertBadge = `<span style="background:${bgAlert};color:${alertColor};border:1px solid ${alertColor}50;
            border-radius:4px;padding:1px 6px;font-size:11px;">⚠ Alerte</span>`
      }

      const buttonHtml = showDetailButton
        ? `<button
            onclick="window.__navigateToDam && window.__navigateToDam('${dam.id}')"
            style="
              margin-top:10px; width:100%; padding:5px 0;
              background:#0ea5e9; color:white; border:none;
              border-radius:5px; cursor:pointer; font-size:12px; font-weight:600;
            ">
            Voir le détail →
          </button>`
        : ''

      marker.bindPopup(`
        <div style="min-width:180px; font-family:system-ui,sans-serif;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${dam.name}</div>
          ${alertBadge}
          <table style="margin-top:6px;width:100%;font-size:12px;border-collapse:collapse;">
            <tr><td style="color:#888;padding:2px 0;">Remplissage</td>
                <td style="font-weight:600;color:${color};text-align:right;">${pct}</td></tr>
            <tr><td style="color:#888;padding:2px 0;">Statut</td>
                <td style="font-weight:600;color:${color};text-align:right;">${getFillLabel(dam.fillPercent)}</td></tr>
            <tr><td style="color:#888;padding:2px 0;">Réserve</td>
                <td style="font-weight:600;text-align:right;">${reserveText}</td></tr>
            <tr><td style="color:#888;padding:2px 0;">Capacité</td>
                <td style="font-weight:600;text-align:right;">${capText}</td></tr>
          </table>
          ${buttonHtml}
        </div>
      `, { maxWidth: 240 })

      marker.addTo(map)
      markersRef.current.push(marker)
    })

    // Auto-fit map to show all actual dam positions realistically
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current)
      const bounds = group.getBounds().pad(0.1)
      if (bounds.isValid()) {
        map.fitBounds(bounds, { maxZoom: 9, padding: [20, 20] })
      }
    }

    // Expose navigate for popup button clicks
    ;(window as { __navigateToDam?: (id: string) => void }).__navigateToDam = (id: string) => {
      navigate(`/dam/${id}`)
    }
  }, [dams, alerts, navigate])

  return (
    <Card className="shadow-sm border overflow-hidden">
      {showHeader && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span>🗺️</span>
            Carte — Région Rabat-Salé-Kénitra
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Legend */}
        {showLegend && (
          <div className="flex flex-wrap gap-3 px-4 pb-2 text-xs text-muted-foreground">
            {[
              { label: 'Critique (<15%)', color: '#ef4444' },
              { label: 'Bas (<40%)',      color: '#f97316' },
              { label: 'Moyen (<65%)',    color: '#eab308' },
              { label: 'Bon (<85%)',      color: '#22c55e' },
              { label: 'Élevé (<95%)',    color: '#0ea5e9' },
              { label: 'Très élevé',      color: '#8b5cf6' },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1">
                <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full inline-block" />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Map container */}
        <div
          ref={mapContainerRef}
          style={{ height: 380, width: '100%' }}
        />
      </CardContent>
    </Card>
  )
}
