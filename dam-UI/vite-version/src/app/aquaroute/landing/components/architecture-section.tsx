"use client"

import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'

export function ArchitectureSection() {
  const volARef = useRef<HTMLDivElement>(null)
  const volBRef = useRef<HTMLDivElement>(null)
  const volCRef = useRef<HTMLDivElement>(null)
  const barARef = useRef<HTMLDivElement>(null)
  const barBRef = useRef<HTMLDivElement>(null)
  const barCRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const levels = [[87,62,45], [79,68,52], [83,71,49], [88,65,44]]
    let idx = 0
    
    const interval = setInterval(() => {
      idx = (idx + 1) % levels.length
      const [a, b, c] = levels[idx]
      
      if (volARef.current) volARef.current.textContent = a + '%'
      if (volBRef.current) volBRef.current.textContent = b + '%'
      if (volCRef.current) volCRef.current.textContent = c + '%'
      
      if (barARef.current) barARef.current.style.width = a + '%'
      if (barBRef.current) barBRef.current.style.width = b + '%'
      if (barCRef.current) barCRef.current.style.width = c + '%'
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section id="architecture" className="py-24 sm:py-32 relative overflow-hidden bg-slate-50/50 dark:bg-slate-900/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Intelligence collective</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Architecture Système
          </h2>
          <p className="text-lg text-muted-foreground">
            Découvrez comment notre agent IA intègre en temps réel les données issues de multiples sources pour anticiper et optimiser les transferts hydriques.
          </p>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .arch-wrap { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; display: flex; justify-content: center; width: 100%; top: 0; }
          .arch-canvas { background: #ffffff; border-radius: 20px; box-shadow: 0 4px 32px rgba(0,0,0,.07), 0 1px 4px rgba(0,0,0,.04); padding: 36px 40px 40px; width: 100%; max-width: 960px; /* Reset dark mode traits */ color: #1e293b; }
          .dark .arch-canvas { background: #0f172a; box-shadow: 0 4px 32px rgba(0,0,0,.3), 0 1px 4px rgba(0,0,0,.2); border: 1px solid #1e293b; color: #f8fafc; }
          
          /* ── section label ── */
          .arch-canvas .sec-label { font-size: 9.5px; font-weight: 600; letter-spacing: 1.3px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; }
          
          /* ── source cards ── */
          .arch-canvas .sources { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 0; }
          .arch-canvas .src-card { background: #f8faff; border: 1px solid #e8edf5; border-radius: 11px; padding: 11px 13px 13px; position: relative; cursor: default; transition: border-color .25s, transform .2s; animation: archFadeSlideUp .5s ease both; }
          .dark .arch-canvas .src-card { background: #1e293b; border-color: #334155; }
          .arch-canvas .src-card:nth-child(1){ animation-delay:.05s }
          .arch-canvas .src-card:nth-child(2){ animation-delay:.12s }
          .arch-canvas .src-card:nth-child(3){ animation-delay:.19s }
          .arch-canvas .src-card:nth-child(4){ animation-delay:.26s }
          .arch-canvas .src-card:hover { border-color: #c4b9f5; transform: translateY(-2px); }
          .arch-canvas .icon-wrap { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 9px; }
          .arch-canvas .src-name { font-size: 11.5px; font-weight: 600; color: #1e293b; line-height: 1.3; }
          .dark .arch-canvas .src-name { color: #f8fafc; }
          .arch-canvas .src-desc { font-size: 10px; color: #94a3b8; margin-top: 3px; line-height: 1.4; }
          .arch-canvas .live-dot { position: absolute; top: 10px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: #22c77a; }
          .arch-canvas .live-dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: #22c77a; opacity: .3; animation: archRipple 2s ease-in-out infinite; }
          
          @keyframes archRipple { 0%,100%{ transform:scale(1); opacity:.3 } 50%{ transform:scale(1.9); opacity:0 } }
          
          /* ── connector SVG ── */
          .arch-canvas .connector { width: 100%; display: block; overflow: visible; }
          .arch-canvas .flow-line { fill: none; stroke-width: 1.5; stroke-dasharray: 5 4; animation: archDash 1.4s linear infinite; }
          .arch-canvas .flow-line.purple { stroke: #c4b9f5; }
          .arch-canvas .flow-line.blue   { stroke: #93c5fd; }
          .arch-canvas .flow-line.green  { stroke: #6ee7b7; }
          .arch-canvas .flow-line.slow   { animation-duration: 2.2s; }
          
          @keyframes archDash { to { stroke-dashoffset: -27; } }
          
          /* ── brain ── */
          .arch-canvas .brain-outer { display: flex; justify-content: center; margin: 2px 0; animation: archFadeSlideUp .5s .3s ease both; }
          .arch-canvas .brain-card { background: #f0eeff; border: 1.2px solid #c4b9f5; border-radius: 14px; padding: 15px 32px 17px; text-align: center; width: 50%; position: relative; animation: archBrainPulse 3.5s ease-in-out infinite; cursor: default; }
          .dark .arch-canvas .brain-card { background: #1e1b4b; border-color: #4f46e5; }
          @keyframes archBrainPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(99,78,218,.0); } 50% { box-shadow: 0 0 0 10px rgba(99,78,218,.08); } }
          .arch-canvas .brain-badge { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #634eda; color: #fff; font-size: 9px; font-weight: 600; letter-spacing: .9px; padding: 2px 12px; border-radius: 20px; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 8px rgba(99,78,218,.4); }
          .arch-canvas .brain-icon { margin: 0 auto 6px; display: block; }
          .arch-canvas .brain-title { font-size: 13.5px; font-weight: 700; color: #3d2fa8; }
          .dark .arch-canvas .brain-title { color: #818cf8; }
          .arch-canvas .brain-sub   { font-size: 10.5px; color: #7168c4; margin-top: 4px; line-height: 1.6; }
          .dark .arch-canvas .brain-sub { color: #a5b4fc; }
          @keyframes archBrainIconPop { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.08) } }
          .arch-canvas .brain-icon-wrap { display:inline-block; animation: archBrainIconPop 3.5s ease-in-out infinite; }
          
          /* ── dams ── */
          .arch-canvas .dams-section { animation: archFadeSlideUp .5s .45s ease both; }
          .arch-canvas .dams-row { display: grid; grid-template-columns: 1fr 36px 1fr 36px 1fr; align-items: center; gap: 0; }
          .arch-canvas .dam-card { background: #f8faff; border: 1px solid #dbeafe; border-radius: 11px; padding: 11px 14px 12px; text-align: center; cursor: default; transition: border-color .25s, transform .2s; }
          .dark .arch-canvas .dam-card { background: #1e293b; border-color: #334155; }
          .arch-canvas .dam-card:hover { transform: translateY(-2px); border-color: #93c5fd; }
          .arch-canvas .dam-card.primary { border-color: #3b82f6; }
          .arch-canvas .dam-header { display: flex; align-items: center; justify-content: center; gap: 5px; }
          .arch-canvas .dam-name { font-size: 11.5px; font-weight: 700; color: #1e293b; }
          .dark .arch-canvas .dam-name { color: #f8fafc; }
          .arch-canvas .dam-sub  { font-size: 9.5px; color: #94a3b8; margin-top: 2px; }
          .arch-canvas .dam-vol  { font-size: 22px; font-weight: 600; color: #1e293b; margin: 7px 0 4px; }
          .dark .arch-canvas .dam-vol { color: #f8fafc; }
          .arch-canvas .dam-bar  { height: 4px; background: #dbeafe; border-radius: 2px; }
          .dark .arch-canvas .dam-bar { background: #334155; }
          .arch-canvas .dam-fill { height: 100%; background: #3b82f6; border-radius: 2px; transition: width 1.2s ease; }
          .arch-canvas .transfer-col { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
          .arch-canvas .transfer-label { font-size: 8.5px; color: #93c5fd; letter-spacing: .5px; }
          
          /* ── results ── */
          .arch-canvas .results-section { animation: archFadeSlideUp .5s .6s ease both; }
          .arch-canvas .div-line { display: flex; align-items: center; gap: 10px; margin: 14px 0 11px; }
          .arch-canvas .div-line::before, .arch-canvas .div-line::after { content: ''; flex: 1; height: 1px; background: #e8edf5; }
          .dark .arch-canvas .div-line::before, .dark .arch-canvas .div-line::after { background: #334155; }
          .arch-canvas .div-line span { font-size: 9.5px; font-weight: 600; letter-spacing: 1.3px; text-transform: uppercase; color: #94a3b8; white-space: nowrap; }
          .arch-canvas .results { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
          .arch-canvas .r-card { border-radius: 11px; padding: 12px 13px 14px; border: 1px solid transparent; cursor: default; transition: transform .2s; }
          .arch-canvas .r-card:hover { transform: translateY(-3px); }
          .arch-canvas .r-title { font-size: 11.5px; font-weight: 700; margin-top: 8px; line-height: 1.3; }
          .arch-canvas .r-desc  { font-size: 9.5px; margin-top: 3px; line-height: 1.5; opacity: .85; }
          .arch-canvas .rc-blue { background:#eff6ff; border-color:#bfdbfe; color:#1e40af; }
          .dark .arch-canvas .rc-blue { background:#1e3a8a20; border-color:#1e3a8a; color:#bfdbfe; }
          .arch-canvas .rc-red  { background:#fff1f2; border-color:#fecdd3; color:#9f1239; }
          .dark .arch-canvas .rc-red { background:#88133720; border-color:#881337; color:#fecdd3; }
          .arch-canvas .rc-grn  { background:#f0fdf4; border-color:#bbf7d0; color:#14532d; }
          .dark .arch-canvas .rc-grn { background:#064e3b20; border-color:#064e3b; color:#bbf7d0; }
          .arch-canvas .rc-pur  { background:#f5f3ff; border-color:#ddd6fe; color:#4c1d95; }
          .dark .arch-canvas .rc-pur { background:#4c1d9520; border-color:#4c1d95; color:#ddd6fe; }
          
          /* ── animations ── */
          @keyframes archFadeSlideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
          
          /* Responsive fixes */
          @media (max-width: 768px) {
            .arch-canvas .sources, .arch-canvas .results { grid-template-columns: 1fr 1fr; }
            .arch-canvas .brain-card { width: 80%; }
            .arch-canvas .dams-row { grid-template-columns: 1fr; gap: 20px; }
            .arch-canvas .transfer-col { transform: rotate(90deg); margin: 10px 0; }
          }
        ` }} />
        
        <div className="arch-wrap w-full">
          <div className="arch-canvas text-left relative z-10">
            {/* SOURCES */}
            <div className="sec-label">Données collectées</div>
            <div className="sources">
              <div className="src-card">
                <div className="live-dot"></div>
                <div className="icon-wrap dark:bg-blue-900" style={{background:'#eff6ff'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div className="src-name">Capteurs barrages</div>
                <div className="src-desc">Niveau d'eau en temps réel</div>
              </div>

              <div className="src-card">
                <div className="live-dot" style={{animationDelay:'.6s'}}></div>
                <div className="icon-wrap dark:bg-amber-900" style={{background:'#fefce8'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </div>
                <div className="src-name">Données météo</div>
                <div className="src-desc">Pluie, températures, vent</div>
              </div>

              <div className="src-card">
                <div className="live-dot" style={{animationDelay:'1.1s'}}></div>
                <div className="icon-wrap dark:bg-green-900" style={{background:'#f0fdf4'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div className="src-name">Population &amp; Usages</div>
                <div className="src-desc">Régions, agricole, industriel</div>
              </div>

              <div className="src-card">
                <div className="live-dot" style={{animationDelay:'1.7s'}}></div>
                <div className="icon-wrap dark:bg-purple-900" style={{background:'#fdf4ff'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                </div>
                <div className="src-name">Historique &amp; Saisonnalité</div>
                <div className="src-desc">Tendances passées</div>
              </div>
            </div>

            {/* CONNECTOR: sources -> brain */}
            <svg className="connector" viewBox="0 0 880 54" style={{height:'54px'}}>
              <defs>
                <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </marker>
              </defs>
              <path className="flow-line purple" d="M110 2 Q110 34 440 52" markerEnd="url(#ah)"/>
              <path className="flow-line purple slow" d="M330 2 Q330 34 440 52" markerEnd="url(#ah)"/>
              <path className="flow-line purple slow" d="M550 2 Q550 34 440 52" markerEnd="url(#ah)"/>
              <path className="flow-line purple" d="M770 2 Q770 34 440 52" markerEnd="url(#ah)"/>

              <circle r="3.5" fill="#634eda" opacity=".95"><animateMotion dur="1.7s" repeatCount="indefinite" path="M110 2 Q110 34 440 52"/></circle>
              <circle r="3.5" fill="#3b82f6" opacity=".8"><animateMotion dur="2.2s" begin=".55s" repeatCount="indefinite" path="M330 2 Q330 34 440 52"/></circle>
              <circle r="3.5" fill="#22c77a" opacity=".8"><animateMotion dur="2s" begin=".25s" repeatCount="indefinite" path="M550 2 Q550 34 440 52"/></circle>
              <circle r="3.5" fill="#a855f7" opacity=".8"><animateMotion dur="2.5s" begin=".9s" repeatCount="indefinite" path="M770 2 Q770 34 440 52"/></circle>
            </svg>

            {/* BRAIN */}
            <div className="brain-outer">
              <div className="brain-card">
                <div className="brain-badge">Agent AI</div>
                <div className="brain-icon-wrap">
                  <svg className="brain-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#634eda" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                  </svg>
                </div>
                <div className="brain-title">Cerveau IA — AquaRoute</div>
                <div className="brain-sub">Analyse toutes les données simultanément<br/>Prédit les besoins en eau pour les prochains jours</div>
              </div>
            </div>

            {/* CONNECTOR: brain -> dams */}
            <svg className="connector" viewBox="0 0 880 54" style={{height:'54px'}}>
              <defs>
                <marker id="ah2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </marker>
              </defs>
              <path className="flow-line blue" d="M440 2 Q260 32 150 52" markerEnd="url(#ah2)"/>
              <path className="flow-line blue slow" d="M440 2 L440 52" markerEnd="url(#ah2)"/>
              <path className="flow-line blue" d="M440 2 Q620 32 730 52" markerEnd="url(#ah2)"/>

              <circle r="3.5" fill="#3b82f6" opacity=".95"><animateMotion dur="1.6s" repeatCount="indefinite" path="M440 2 Q260 32 150 52"/></circle>
              <circle r="3.5" fill="#3b82f6" opacity=".95"><animateMotion dur="1.6s" begin=".35s" repeatCount="indefinite" path="M440 2 L440 52"/></circle>
              <circle r="3.5" fill="#3b82f6" opacity=".95"><animateMotion dur="1.6s" begin=".7s" repeatCount="indefinite" path="M440 2 Q620 32 730 52"/></circle>
            </svg>

            {/* DAMS */}
            <div className="dams-section">
              <div className="dams-row">
                <div className="dam-card primary">
                  <div className="dam-header">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18M5 21V10l7-7 7 7v11"/>
                    </svg>
                    <span className="dam-name">Barrage A</span>
                  </div>
                  <div className="dam-sub">Réservoir principal</div>
                  <div className="dam-vol" ref={volARef}>87%</div>
                  <div className="dam-bar"><div className="dam-fill" ref={barARef} style={{width:'87%'}}></div></div>
                </div>

                <div className="transfer-col text-blue-400">
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <line x1="2" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3">
                      <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" repeatCount="indefinite"/>
                    </line>
                    <polygon points="20,3 26,6 20,9" fill="currentColor"/>
                  </svg>
                  <span className="transfer-label">transfert</span>
                </div>

                <div className="dam-card">
                  <div className="dam-header">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18M5 21V10l7-7 7 7v11"/>
                    </svg>
                    <span className="dam-name">Barrage B</span>
                  </div>
                  <div className="dam-sub">Réservoir secondaire</div>
                  <div className="dam-vol" ref={volBRef}>62%</div>
                  <div className="dam-bar"><div className="dam-fill" ref={barBRef} style={{width:'62%'}}></div></div>
                </div>

                <div className="transfer-col text-blue-400">
                  <svg width="28" height="12" viewBox="0 0 28 12">
                    <line x1="2" y1="6" x2="24" y2="6" stroke="currentColor" strokeWidth="1.4" strokeDasharray="4 3">
                      <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="1s" begin=".3s" repeatCount="indefinite"/>
                    </line>
                    <polygon points="20,3 26,6 20,9" fill="currentColor"/>
                  </svg>
                  <span className="transfer-label">transfert</span>
                </div>

                <div className="dam-card">
                  <div className="dam-header">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18M5 21V10l7-7 7 7v11"/>
                    </svg>
                    <span className="dam-name">Barrage C</span>
                  </div>
                  <div className="dam-sub">Réservoir régional</div>
                  <div className="dam-vol" ref={volCRef}>45%</div>
                  <div className="dam-bar"><div className="dam-fill" ref={barCRef} style={{width:'45%'}}></div></div>
                </div>
              </div>
            </div>

            {/* CONNECTOR: dams -> results */}
            <svg className="connector" viewBox="0 0 880 44" style={{height:'44px'}}>
              <defs>
                <marker id="ah3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M2 1L8 5L2 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </marker>
              </defs>
              <path className="flow-line green slow" d="M440 2 Q210 28 110 42" markerEnd="url(#ah3)"/>
              <path className="flow-line green" d="M440 2 Q370 28 330 42" markerEnd="url(#ah3)"/>
              <path className="flow-line green slow" d="M440 2 Q510 28 550 42" markerEnd="url(#ah3)"/>
              <path className="flow-line green" d="M440 2 Q660 28 770 42" markerEnd="url(#ah3)"/>

              <circle r="3" fill="#22c77a" opacity=".9"><animateMotion dur="1.9s" repeatCount="indefinite" path="M440 2 Q210 28 110 42"/></circle>
              <circle r="3" fill="#22c77a" opacity=".9"><animateMotion dur="1.5s" begin=".2s" repeatCount="indefinite" path="M440 2 Q370 28 330 42"/></circle>
              <circle r="3" fill="#22c77a" opacity=".9"><animateMotion dur="1.7s" begin=".5s" repeatCount="indefinite" path="M440 2 Q510 28 550 42"/></circle>
              <circle r="3" fill="#22c77a" opacity=".9"><animateMotion dur="2s" begin=".1s" repeatCount="indefinite" path="M440 2 Q660 28 770 42"/></circle>
            </svg>

            {/* RESULTS */}
            <div className="results-section">
              <div className="div-line"><span>Résultats</span></div>
              <div className="results">
                <div className="r-card rc-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    <polyline points="21 3 21 9 15 9"/>
                  </svg>
                  <div className="r-title">Transferts optimisés</div>
                  <div className="r-desc">Volumes barrage–barrage · Calendrier planifié</div>
                </div>

                <div className="r-card rc-red">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div className="r-title">Alertes temps réel</div>
                  <div className="r-desc">Crue, pénurie, risque · Notification immédiate</div>
                </div>

                <div className="r-card rc-grn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18M9 21V9"/>
                  </svg>
                  <div className="r-title">Dashboard &amp; Scénarios</div>
                  <div className="r-desc">Carte interactive · Simulations &amp; rapports</div>
                </div>

                <div className="r-card rc-pur">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <div className="r-title">Chatbot IA</div>
                  <div className="r-desc">Communication en langage naturel</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
