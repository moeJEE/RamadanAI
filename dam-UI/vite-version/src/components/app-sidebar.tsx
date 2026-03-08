"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Bell,
  Droplets,
  Settings,
  Map,
  Cloud,
  Network,
  ArrowLeftRight,
  Waves,
  FlaskConical,
  Bot,
  Shield,
  Activity,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { useAlertStore } from "@/stores/alert-store"

const navMain = [
  { title: "Dashboard",    icon: LayoutDashboard, url: "/dashboard" },
  { title: "Barrages",     icon: Waves,           url: "/barrages" },
  { title: "Alertes",      icon: Bell,            url: "/alerts",  showBadge: true },
]

const navAnalyse = [
  { title: "Météo",        icon: Cloud,           url: "/meteo" },
  { title: "Réseau",       icon: Network,         url: "/reseau" },
  { title: "Transferts",   icon: ArrowLeftRight,  url: "/transferts" },
  { title: "Suivi Live",   icon: Activity,        url: "/suivi" },
  { title: "Simulateur",   icon: FlaskConical,    url: "/simulate" },
  { title: "Agent IA",     icon: Bot,             url: "/agent" },
]

const navSystem = [
  { title: "Administration", icon: Shield,        url: "/admin" },
  { title: "Paramètres",    icon: Settings,       url: "/parametres" },
]

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  side?: "left" | "right"
}

export function AppSidebar({ variant = "sidebar", collapsible = "icon", side = "left", ...props }: AppSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const alerts = useAlertStore((s) => s.alerts)
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length

  function NavGroup({ label, items }: { label: string; items: typeof navMain }) {
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = location.pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive}
                    tooltip={item.title}
                    className="cursor-pointer"
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {'showBadge' in item && item.showBadge && criticalAlerts > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                        {criticalAlerts}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar variant={variant} collapsible={collapsible} side={side} {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                <Droplets className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold text-sm">AquaRoute AI</span>
                <span className="text-xs text-muted-foreground">Rabat-Salé-Kénitra</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Navigation" items={navMain} />
        <SidebarSeparator />
        <NavGroup label="Analyse" items={navAnalyse} />
        <SidebarSeparator />
        <NavGroup label="Système" items={navSystem} />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Région RSK" className="cursor-default text-xs text-muted-foreground">
              <Map className="size-4" />
              <span>Région RSK · PoC v0.1</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
