import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import { BaseLayout } from '@/components/layouts/base-layout'
import { useDamStore } from '@/stores/dam-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Network, ArrowRight } from 'lucide-react'
import { loadEdgesData } from '@/data/edges'
import type { WaterEdge } from '@/data/types'

// Hook pour récupérer le thème actuel
import { useTheme } from '@/hooks/use-theme'

// Coordinates mapping (Dams are purposefully omitted here to use dynamic DB coords)
const DAM_COORDS: Record<string, { lat: number; lon: number; name: string }> = {

  // Complexes & Stations
  'complex_bouregreg': { lat: 33.98, lon: -6.80, name: 'Complexe Bouregreg' },
  'station_bouregreg': { lat: 33.97, lon: -6.82, name: 'Station Tr. Bouregreg' },
  'basin_bouregreg_chaouia': { lat: 33.60, lon: -6.50, name: 'Bassin Bouregreg-Chaouia' },
  'basin_sebou': { lat: 34.25, lon: -5.50, name: 'Bassin Sebou' },

  // Villes de la région
  'city_rabat': { lat: 34.0209, lon: -6.8416, name: 'Rabat' },
  'city_sale': { lat: 34.0389, lon: -6.8166, name: 'Salé' },
  'city_temara': { lat: 33.9267, lon: -6.9122, name: 'Témara' },
  'city_skhirat': { lat: 33.8536, lon: -7.0361, name: 'Skhirat' },
  'city_bouznika': { lat: 33.7894, lon: -7.1597, name: 'Bouznika' },
  'city_ain_aouda': { lat: 33.8117, lon: -6.7936, name: 'Ain Aouda' },
  'city_rommani': { lat: 33.5367, lon: -6.6166, name: 'Rommani' },
  'city_kenitra': { lat: 34.2610, lon: -6.5802, name: 'Kénitra' },
}

const RELATION_STYLE: Record<string, { color: string; dash: string; label: string }> = {
  'contains_major_dam': { color: '#0ea5e9', dash: '', label: 'Bassin versant' },
  'feeds': { color: '#22c55e', dash: '', label: 'Alimente' },
  'includes': { color: '#8b5cf6', dash: '', label: 'Inclut' },
  'interconnection_transfer': { color: '#f97316', dash: '6 3', label: 'Interconnexion' },
  'supplies_modeled': { color: '#94a3b8', dash: '4 4', label: 'Alimentation en Eau Potable (AEP)' },
  'strategic_supply_zone': { color: '#ef4444', dash: '8 4', label: 'Zone stratégique' },
  'default': { color: '#64748b', dash: '4 4', label: 'Autre' },
}

export default function ReseauPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { summaries, loading, loadData } = useDamStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const fgRef = useRef<any>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [edges, setEdges] = useState<WaterEdge[]>([])


  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const bgColor = isDark ? '#030712' : '#f8fafc' // Slate-50 en light mode

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadEdgesData().then(setEdges) }, [])

  // Helper pour traduire les IDs techniques en noms lisibles
  const getNodeName = (id: string) => {
    if (DAM_COORDS[id]) return DAM_COORDS[id].name
    const mappedId = id === 'dam_smba' ? 'sidi-mohammed-ben-abdellah' : id
    const possibleIds = [mappedId, id.replace('dam_', ''), id.replace('dam_', '').replace(/_/g, '-')]
    const dam = summaries.find(s => possibleIds.includes(s.id))
    if (dam) return dam.name
    
    // Fallback formaté
    return id
      .replace('dam_', '')
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  // Auto-resize pour le graphe 3D
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Position initiale de la caméra sans rotation (Statique)
  useEffect(() => {
    const distance = 250 // Zoom initial

    if (fgRef.current && graphData.nodes.length > 0) {
      // On place la caméra au centre avec du recul pour voir la matrice
      fgRef.current.cameraPosition({ x: 0, y: 0, z: distance })
    }
  }, [edges.length, summaries.length]) // Relance config camera quand données chargees

  // Transformation des données pour react-force-graph-3d
  const graphData = useMemo(() => {
    if (!edges.length || !summaries.length) return { nodes: [], links: [] }

    const activeNodesSet = new Set<string>()
    const mappedLinks = edges
      .filter(e => {
        // Exclusion formelle des villes du graphe 3D (Focus sur les barrages/bassins)
        if (e.sourceId.startsWith('city_') || e.targetId.startsWith('city_')) return false
        
        if (true) { // Toujours Vision Globale après suppression des filtres
          activeNodesSet.add(e.sourceId)
          activeNodesSet.add(e.targetId)
          return true
        }
        return false
      })
      .map(e => {
        const style = RELATION_STYLE[e.relationType] ?? RELATION_STYLE.default
        return {
          source: e.sourceId,
          target: e.targetId,
          color: style.color,
          name: style.label,
          type: e.relationType,
          distance: e.distanceKm,
          value: e.distanceKm ? 150 / e.distanceKm : 2 // Si distance courte, lien plus fort/lumineux
        }
      })
    
    const validDamIds = new Set(summaries.map(s => {
      // Normalisation des identifiants (sidi-mohammed-ben-abdellah -> dam_smba)
      if (s.id === 'sidi-mohammed-ben-abdellah') return 'dam_smba'
      return `dam_${s.id.replace(/-/g, '_')}`
    }))

    const allowedExtraStations = new Set([
      'station_tr_bouregreg', 'city_rabat', 'city_sale', 'city_temara',
      'city_bouznika', 'city_skhirat', 'city_ain_aouda', 'city_rommani',
      'basin_bouregreg', 'basin_sebou', 'dam_garde_sebou', 'dam_smba',
      'complex_bouregreg', 'city_kenitra', 'basin_bouregreg_chaouia'
    ])

    const allLinks = [...mappedLinks].filter(e => {
       const sValid = validDamIds.has(e.source) || allowedExtraStations.has(e.source)
       const tValid = validDamIds.has(e.target) || allowedExtraStations.has(e.target)
       return sValid && tValid
    })

    // On crée dynamiquement des liens factices pour tous les barrages qui n'ont pas de lien défini
    // Cela permet de rattacher visuellement "Tamesna", "El Mellah" etc. au bassin principal
    summaries.forEach(s => {
      // Ignorer SMBA car il est déjà lié via 'dam_smba'
      if (s.id.includes('sidi-mohammed')) return
      
      activeNodesSet.add(s.id)
      allLinks.push({
        source: 'basin_bouregreg_chaouia',
        target: s.id,
        color: '#38bdf8', // Couleur Bleu ciel pour les attaches hydrauliques
        name: 'Appartient au bassin',
        type: 'basin_relation',
        distance: null,
        value: 1
      })
    })

    const mappedNodes = Array.from(activeNodesSet).map(nodeId => {
      // MAPPING CRITIQUE : Faire le lien entre le noeud graphique "dam_smba" et les données réelles
      let mappedSummaryId = nodeId
      if (nodeId === 'dam_smba') mappedSummaryId = 'sidi-mohammed-ben-abdellah'
      
      const damSummary = summaries.find(s => s.id === mappedSummaryId)

      // Dynamic coordinates fetching from backend vs Static City coords
      let coord = DAM_COORDS[nodeId] || { lat: 34 + (Math.random() - 0.5), lon: -6 + (Math.random() - 0.5) }
      if (damSummary?.lat && damSummary?.lon) {
        coord = { lat: damSummary.lat, lon: damSummary.lon, name: damSummary.name }
      }

      let nodeColor = '#94a3b8'
      let val = 5
      let desc = ''
      // C'est un bassin versant / infrastructure si ce n'est pas dans summary
      let label = nodeId

      if (damSummary) {
        val = 7 // Les vrais Barrages
        const pct = damSummary.fillPercent
        nodeColor = pct == null ? '#6b7280' : pct < 15 ? '#ef4444' : pct < 40 ? '#f97316' : pct < 65 ? '#eab308' : pct < 85 ? '#22c55e' : pct < 95 ? '#0ea5e9' : '#0284c7'
        desc = `Remplissage: ${pct?.toFixed(1) ?? '?'}%\nRéserve: ${damSummary.reserveMm3?.toFixed(2)} Mm³`
        label = damSummary.name
      } else {
        if (nodeId.startsWith('city_')) { nodeColor = '#f59e0b'; val = 5; desc = 'Zone en demande' } // Était 8
        else if (nodeId.startsWith('station_') || nodeId.startsWith('complex_')) { nodeColor = '#8b5cf6'; val = 6; desc = 'Infrastructure de traitement'; label = 'Complexe / Station' } // Était 10
        else if (nodeId.startsWith('basin_')) { nodeColor = '#3b82f6'; val = 8; desc = 'Bassin Hydraulique'; label = nodeId === 'basin_sebou' ? 'Bassin Sebou' : 'Bassin Bouregreg' } // Était 18
        else if (nodeId === 'dam_garde_sebou') { nodeColor = '#0ea5e9'; val = 7; desc = 'Barrage de transfert'; label = 'Garde de Sebou' }
      }

      return {
        id: nodeId,
        name: label,
        val,
        color: nodeColor,
        coord,
        desc,
        isDam: !!damSummary,
        fillPercent: damSummary?.fillPercent
      }
    })

    return { nodes: mappedNodes, links: allLinks }
  }, [edges, summaries])



  return (
    <BaseLayout
      title="Architecture Neuronale du Réseau d'Eau"
      description="Jumeau Numérique 3D des transferts et interconnexions - AquaRoute AI"
    >
      <div className="px-4 lg:px-6 space-y-6 pb-10">

        {/* 3D Map card Principale (Full Width / Impressionnante) */}
        <Card className="@container/card shadow-sm border overflow-hidden relative">
          <CardContent className="p-0 relative" style={{ backgroundColor: bgColor }}>
            {loading && summaries.length === 0
              ? <div className="h-[600px] w-full flex items-center justify-center bg-muted/20 animate-pulse"><Network className="w-12 h-12 text-primary opacity-50" /></div>
              : (
                <div ref={containerRef} style={{ height: 650, width: '100%' }} className="overflow-hidden cursor-crosshair">
                  <ForceGraph3D
                    ref={fgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    graphData={graphData}
                    // Gel de la position des nœuds
                    cooldownTicks={150} // On laisse le temps aux nœuds de bien s'écarter avant le gel brutal
                    enableNodeDrag={false}
                    d3VelocityDecay={0.3} // Friction modérée pour laisser la "répulsion" agir avant le stop
                    onEngineStop={() => {
                      if (fgRef.current) {
                        const chargeForce = fgRef.current.d3Force('charge')
                        if (chargeForce) chargeForce.strength(-900) // Très forte répulsion pour un max d'espace

                        const linkForce = fgRef.current.d3Force('link')
                        if (linkForce) linkForce.distance((link: any) => link.value ? 250 / link.value : 100) // Liens très longs

                        // IMPORTANT: NO reheat simulation to keep them completely static après les cooldownTicks
                      }
                    }}
                    // Effets de particules cosmiques / eau fluides pour les liens
                    linkWidth={link => (link as any).value ? Math.min((link as any).value * 0.3, 1.5) : 0.5} // Était 0.5 et 3
                    linkColor="color"
                    linkDirectionalParticles={link => (link as any).value ? Math.min(Math.floor((link as any).value), 10) : 2}
                    linkDirectionalParticleSpeed={0.005}
                    linkDirectionalParticleWidth={link => (link as any).type === 'interconnection_transfer' ? 1.5 : 1} // Était 3.5 et 2
                    linkDirectionalParticleColor="color"
                    linkCurvature={0.25} // Courbures organiques

                    // Gestion avancée des nœuds 3D
                    nodeThreeObject={(node: any) => {
                      const group = new THREE.Group()

                      // 1. Géométrie 3D par type
                      let geometry;
                      let isWireframe = false;
                      let opacity = 0.9;

                      if (node.id.startsWith('dam_')) {
                        const height = node.fillPercent ? Math.max(2, (node.fillPercent / 100) * node.val) : node.val;
                        geometry = new THREE.CylinderGeometry(node.val * 0.6, node.val * 0.6, height, 16)
                      } else if (node.id.startsWith('city_')) {
                        geometry = new THREE.BoxGeometry(node.val, node.val, node.val)
                      } else if (node.id.startsWith('basin_')) {
                        geometry = new THREE.SphereGeometry(node.val * 1.5, 16, 16)
                        isWireframe = true
                        opacity = isDark ? 0.3 : 0.6
                      } else {
                        geometry = new THREE.DodecahedronGeometry(node.val * 0.8)
                      }

                      // 2. Matériau brillant pseudo-néon
                      const material = new THREE.MeshPhongMaterial({
                        color: node.color,
                        transparent: true,
                        opacity: opacity,
                        wireframe: isWireframe,
                        shininess: 100,
                      })

                      const mesh = new THREE.Mesh(geometry, material)
                      group.add(mesh)

                      // 3. Effet Halo/Lumière sur les éléments critiques
                      if (node.id.startsWith('dam_') || node.color === '#ef4444') {
                        const light = new THREE.PointLight(node.color, 2, node.val * 5)
                        group.add(light)

                        if (node.fillPercent !== undefined && node.fillPercent < 15) {
                          const ringGeo = new THREE.RingGeometry(node.val, node.val + 2, 32)
                          const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
                          const ring = new THREE.Mesh(ringGeo, ringMat)
                          ring.rotation.x = Math.PI / 2
                          group.add(ring)
                        }
                      }

                      return group
                    }}
                    nodeLabel={(node: any) => {
                      return `
                        <div class="bg-black/90 text-white p-3 rounded-lg border border-sky-500/50 shadow-xl text-sm min-w-[150px]">
                          <strong class="text-sky-400 block mb-1">${node.name}</strong>
                          <span class="text-slate-300 text-xs whitespace-pre-line">${node.desc ? node.desc : ''}</span>
                        </div>
                      `
                    }}
                    backgroundColor={bgColor} // Dynamique au theme
                    showNavInfo={false}
                    onNodeClick={(node: any) => {
                      fgRef.current.cameraPosition(
                        { x: node.x, y: node.y, z: node.z + 50 },
                        node,
                        1000
                      )
                      if (node.isDam) {
                        setTimeout(() => navigate(`/dam/${node.id}`), 1000)
                      }
                    }}
                    onNodeHover={(node) => {
                      if (containerRef.current) {
                        containerRef.current.style.cursor = node ? 'pointer' : 'crosshair'
                      }
                    }}
                  />

                  {/* Overlay legend interactif et futuriste */}
                  <div className={`absolute bottom-4 left-4 backdrop-blur-md p-4 rounded-xl border shadow-lg pointer-events-none w-80 ${isDark ? 'bg-black/60 border-sky-900 shadow-[0_0_20px_rgba(14,165,233,0.15)]' : 'bg-white/80 border-slate-200'}`}>
                    <h4 className={`flex items-center gap-2 text-sm font-bold mb-3 border-b pb-2 ${isDark ? 'text-sky-400 border-sky-900' : 'text-sky-600 border-slate-200'}`}>
                      <ArrowRight className="h-4 w-4" /> Légende Topologique
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#3b82f6] opacity-60"></div> Bassins (Sphères)
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-4 rounded-full bg-gradient-to-b from-[#22c55e] via-[#eab308] to-[#ef4444]"></div> Barrages (Cylindres)
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#8b5cf6] rotate-45 transform origin-center"></div> Stations/Complexes
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#f59e0b]"></div> Villes / Demande
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </CardContent>

        </Card>

        {/* Info Cards (Bottom) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="@container/card shadow-sm border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Trafic et Liens Majeurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {edges
                  .filter(e => {
                     // Même filtrage pour la liste texte
                     const validDamIds = new Set(summaries.map(s => s.id === 'sidi-mohammed-ben-abdellah' ? 'dam_smba' : `dam_${s.id.replace(/-/g, '_')}`))
                     const allowedExtraStations = new Set(['station_tr_bouregreg', 'city_rabat', 'city_sale', 'city_temara', 'city_bouznika', 'city_skhirat', 'city_ain_aouda', 'city_rommani', 'basin_bouregreg', 'basin_sebou', 'dam_garde_sebou', 'dam_smba', 'complex_bouregreg', 'city_kenitra'])
                     return (validDamIds.has(e.sourceId) || allowedExtraStations.has(e.sourceId)) && 
                            (validDamIds.has(e.targetId) || allowedExtraStations.has(e.targetId))
                  })
                  .map((e, i) => {
                    const style = RELATION_STYLE[e.relationType] ?? RELATION_STYLE.default
                    return (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-2 hover:bg-muted/50 transition-colors rounded-md px-2">
                        <div className="flex flex-1 items-center gap-2 text-sm">
                          <span className="font-semibold text-foreground">{getNodeName(e.sourceId)}</span>
                          <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: style.color }} />
                          <span className="font-semibold text-foreground">{getNodeName(e.targetId)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                          <Badge variant="secondary" className="text-[10px]" style={{ borderColor: style.color, color: style.color, backgroundColor: `${style.color}15` }}>
                            {style.label}
                          </Badge>
                          {e.distanceKm && (
                            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{e.distanceKm} km</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>

          <Card className="@container/card shadow-sm border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Statut des Interconnexions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Transferts Nord-Sud</span>
                  <span className="font-medium text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-emerald-500 to-sky-500 h-1.5 rounded-full w-full"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Bouregreg - Chaouia</span>
                  <span className="font-medium text-sky-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> Actif</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-sky-400 to-sky-600 h-1.5 rounded-full w-[80%]"></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Charge réseau global</span>
                  <span className="font-medium text-amber-500">Tension élevée</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-1.5 rounded-full w-[92%]"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </BaseLayout>
  )
}
