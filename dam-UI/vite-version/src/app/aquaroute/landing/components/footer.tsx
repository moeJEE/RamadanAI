"use client"

import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Waves, Github, Twitter, Linkedin } from 'lucide-react'

const footerLinks = {
  application: [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Barrages', href: '/barrages' },
    { name: 'Alertes', href: '/alerts' },
    { name: 'Simulation', href: '/simulate' },
  ],
  outils: [
    { name: 'Agent IA', href: '/agent' },
    { name: 'Météo', href: '/meteo' },
    { name: 'Transferts', href: '/transferts' },
    { name: 'Réseau', href: '/reseau' },
  ],
  projet: [
    { name: 'README', href: 'https://github.com/moeJEE/RamadanAI#readme', external: true },
    { name: 'GitHub', href: 'https://github.com/moeJEE/RamadanAI', external: true },
    { name: 'API Docs', href: 'http://localhost:8000/docs', external: true },
    { name: 'Admin', href: '/admin' },
  ],
}

const socialLinks = [
  { name: 'GitHub', href: 'https://github.com/moeJEE/RamadanAI', icon: Github },
  { name: 'Twitter', href: '#', icon: Twitter },
  { name: 'LinkedIn', href: '#', icon: Linkedin },
]

export function LandingFooter() {
  return (
    <footer id="contact" className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid gap-8 grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="col-span-2 max-w-sm">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Waves className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-xl">AquaRoute AI</span>
            </div>
            <p className="text-muted-foreground mb-6 text-sm">
              Système intelligent de prévision et d'optimisation des transferts hydriques
              pour la région Rabat-Salé-Kénitra — PoC IA v0.1.
            </p>
            <div className="flex space-x-2">
              {socialLinks.map((social) => (
                <Button key={social.name} variant="ghost" size="icon" asChild>
                  <a
                    href={social.href}
                    aria-label={social.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <social.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Application</h4>
            <ul className="space-y-3">
              {footerLinks.application.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Outils</h4>
            <ul className="space-y-3">
              {footerLinks.outils.map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Projet</h4>
            <ul className="space-y-3">
              {footerLinks.projet.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Footer */}
        <div className="flex justify-center text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AquaRoute AI</span>
        </div>
      </div>
    </footer>
  )
}
