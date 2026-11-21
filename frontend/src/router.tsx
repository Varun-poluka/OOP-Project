import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequireAuth } from '@/auth/RequireAuth'
import { AppShell } from '@/layout/AppShell'
import { RootLayout } from '@/layout/RootLayout'
import { LoginPage } from '@/pages/LoginPage'
import { AssignmentStrategyPage } from '@/pages/admin/AssignmentStrategyPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { SearchPage } from '@/pages/admin/SearchPage'
import { ServicesPage } from '@/pages/admin/ServicesPage'
import { SlaPoliciesPage } from '@/pages/admin/SlaPoliciesPage'
import { MyIncidentsPage } from '@/pages/employee/MyIncidentsPage'
import { ReportIncidentPage } from '@/pages/employee/ReportIncidentPage'
import { IncidentDetailPage } from '@/pages/shared/IncidentDetailPage'
import { NotificationsPage } from '@/pages/shared/NotificationsPage'
import { AtRiskPage } from '@/pages/technician/AtRiskPage'
import { MyQueuePage } from '@/pages/technician/MyQueuePage'

// Nested routes: a parent's element renders its matched child at <Outlet/>.
// RequireAuth checks login and role (see auth/roleHome.ts for which role sees which path),
// then AppShell draws the sidebar around the page.
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              // Employee
              { path: '/incidents/new', element: <ReportIncidentPage /> },
              { path: '/incidents/mine', element: <MyIncidentsPage /> },
              // Technician
              { path: '/queue', element: <MyQueuePage /> },
              { path: '/at-risk', element: <AtRiskPage /> },
              // Admin
              { path: '/admin', element: <DashboardPage /> },
              { path: '/admin/search', element: <SearchPage /> },
              { path: '/admin/sla', element: <SlaPoliciesPage /> },
              { path: '/admin/strategy', element: <AssignmentStrategyPage /> },
              { path: '/admin/services', element: <ServicesPage /> },
              // Shared
              { path: '/incidents/:id', element: <IncidentDetailPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              // "/" and unknown URLs: RequireAuth finds no rule for them and sends the user home.
              { path: '*', element: null },
            ],
          },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
