import { lazy } from 'react'
import { Navigate } from 'react-router-dom'

const Dashboard   = lazy(() => import('@/app/aquaroute/dashboard/page'))
const DamDetail   = lazy(() => import('@/app/aquaroute/dam/page'))
const Alerts      = lazy(() => import('@/app/aquaroute/alerts/page'))
const Barrages    = lazy(() => import('@/app/aquaroute/barrages/page'))
const Meteo       = lazy(() => import('@/app/aquaroute/meteo/page'))
const Reseau      = lazy(() => import('@/app/aquaroute/reseau/page'))
const Transferts  = lazy(() => import('@/app/aquaroute/transferts/page'))
const Suivi       = lazy(() => import('@/app/aquaroute/suivi/page'))
const Simulate    = lazy(() => import('@/app/aquaroute/simulate/page'))
const Agent       = lazy(() => import('@/app/aquaroute/agent/page'))
const Admin       = lazy(() => import('@/app/aquaroute/admin/page'))
const Parametres  = lazy(() => import('@/app/aquaroute/parametres/page'))

// Error pages (kept from template)
const NotFound = lazy(() => import('@/app/errors/not-found/page'))

export interface RouteConfig {
  path: string
  element: React.ReactNode
  children?: RouteConfig[]
}

export const routes: RouteConfig[] = [
  { path: '/',              element: <Navigate to="dashboard" replace /> },
  { path: '/dashboard',     element: <Dashboard /> },
  { path: '/dam/:damId',    element: <DamDetail /> },
  { path: '/alerts',        element: <Alerts /> },
  { path: '/barrages',      element: <Barrages /> },
  { path: '/meteo',         element: <Meteo /> },
  { path: '/reseau',        element: <Reseau /> },
  { path: '/transferts',    element: <Transferts /> },
  { path: '/suivi',         element: <Suivi /> },
  { path: '/simulate',      element: <Simulate /> },
  { path: '/agent',         element: <Agent /> },
  { path: '/admin',         element: <Admin /> },
  { path: '/parametres',    element: <Parametres /> },
  { path: '*',              element: <NotFound /> },
]
