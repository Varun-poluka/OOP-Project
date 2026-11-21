import { lazy } from 'react'

// Route-level code splitting: each page below becomes its own JS file that the browser
// downloads the first time the page is visited, instead of one big bundle up front.
// React.lazy needs a default export and our pages use named ones, so each import picks the
// named export out. AppShell shows a loading skeleton (Suspense) while the file arrives.
// LoginPage is not here: it is the first screen everyone sees, so router.tsx imports it
// normally. This file exports only components, which keeps Vite's Fast Refresh working.
export const AssignmentStrategyPage = lazy(() => import('@/pages/admin/AssignmentStrategyPage').then((m) => ({ default: m.AssignmentStrategyPage })))
export const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })))
export const SearchPage = lazy(() => import('@/pages/admin/SearchPage').then((m) => ({ default: m.SearchPage })))
export const ServicesPage = lazy(() => import('@/pages/admin/ServicesPage').then((m) => ({ default: m.ServicesPage })))
export const SlaPoliciesPage = lazy(() => import('@/pages/admin/SlaPoliciesPage').then((m) => ({ default: m.SlaPoliciesPage })))
export const TechniciansPage = lazy(() => import('@/pages/admin/TechniciansPage').then((m) => ({ default: m.TechniciansPage })))
export const MyIncidentsPage = lazy(() => import('@/pages/employee/MyIncidentsPage').then((m) => ({ default: m.MyIncidentsPage })))
export const ReportIncidentPage = lazy(() => import('@/pages/employee/ReportIncidentPage').then((m) => ({ default: m.ReportIncidentPage })))
export const IncidentDetailPage = lazy(() => import('@/pages/shared/IncidentDetailPage').then((m) => ({ default: m.IncidentDetailPage })))
export const NotificationsPage = lazy(() => import('@/pages/shared/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
export const AtRiskPage = lazy(() => import('@/pages/technician/AtRiskPage').then((m) => ({ default: m.AtRiskPage })))
export const MyQueuePage = lazy(() => import('@/pages/technician/MyQueuePage').then((m) => ({ default: m.MyQueuePage })))
