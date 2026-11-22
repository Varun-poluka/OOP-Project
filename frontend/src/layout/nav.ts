import type { ComponentType } from 'react'
import {
  Bell,
  FilePlus2,
  Gauge,
  ListChecks,
  ListTodo,
  ScrollText,
  Search,
  Server,
  Shuffle,
  Tags,
  Timer,
  TriangleAlert,
  UserCog,
  Users,
} from 'lucide-react'
import type { Role } from '@/api/types'

export type NavItem = {
  label: string
  to: string
  icon: ComponentType<{ className?: string }>
}

// The sidebar for each role. Incident detail is not listed: you reach it by opening an incident.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  EMPLOYEE: [
    { label: 'My incidents', to: '/incidents/mine', icon: ListChecks },
    { label: 'Report incident', to: '/incidents/new', icon: FilePlus2 },
  ],
  TECHNICIAN: [
    { label: 'My queue', to: '/queue', icon: ListTodo },
    { label: 'At risk', to: '/at-risk', icon: TriangleAlert },
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/admin', icon: Gauge },
    { label: 'Search', to: '/admin/search', icon: Search },
    { label: 'SLA policies', to: '/admin/sla', icon: Timer },
    { label: 'Assignment strategy', to: '/admin/strategy', icon: Shuffle },
    { label: 'Services', to: '/admin/services', icon: Server },
    { label: 'Technicians', to: '/admin/technicians', icon: Users },
    { label: 'Users', to: '/admin/users', icon: UserCog },
    { label: 'Categories', to: '/admin/categories', icon: Tags },
    { label: 'Audit log', to: '/admin/audit', icon: ScrollText },
  ],
}

export const SHARED_NAV: NavItem[] = [{ label: 'Notifications', to: '/notifications', icon: Bell }]

export const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: 'Employee',
  TECHNICIAN: 'Technician',
  ADMIN: 'Administrator',
}
