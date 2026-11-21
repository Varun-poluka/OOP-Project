import { Link, Outlet, useMatch } from 'react-router'
import { ChevronDown, LogOut } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { LiveUpdatesProvider } from '@/live/LiveUpdatesProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAuth } from '@/auth/useAuth'
import { cn } from '@/lib/utils'
import { LiveIndicator } from './LiveIndicator'
import { NAV_BY_ROLE, ROLE_LABEL, SHARED_NAV, type NavItem } from './nav'

/**
 * The frame around every logged-in page: dark sidebar on the left, top bar, and the
 * current page in the middle (<Outlet/>).
 * Width ≥ 1024 px (lg): full sidebar with labels. Below that (tablet): a 64 px icon rail,
 * with each label shown as a tooltip.
 */
export function AppShell() {
  const { user, logout } = useAuth()
  // RequireAuth renders us only when logged in, so user is never null here.
  if (user === null) return null

  const items = NAV_BY_ROLE[user.role]

  return (
    <LiveUpdatesProvider>
      <div className="flex min-h-svh">
        <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:w-60">
          <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
            <BrandMark />
            <div className="hidden leading-tight lg:block">
              <p className="font-semibold text-sidebar-accent-foreground">I-ITSM</p>
              <p className="font-mono text-[10px] tracking-[0.14em] text-sidebar-muted uppercase">Service desk</p>
            </div>
          </div>

          <nav aria-label="Main" className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
            <NavSection title={ROLE_LABEL[user.role]} items={items} />
            <NavSection title="General" items={SHARED_NAV} />
          </nav>

          <div className="hidden border-t border-sidebar-border p-4 lg:block">
            <p className="font-mono text-[10px] tracking-[0.14em] text-sidebar-muted uppercase">Signed in as</p>
            <p className="mt-1 truncate text-sidebar-accent-foreground">{user.name}</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-1 border-b bg-background/85 px-4 backdrop-blur md:px-8">
            <LiveIndicator />
            <NotificationBell />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <span className="grid size-7 place-items-center rounded-full bg-accent font-mono text-xs font-medium text-accent-foreground">
                    {initials(user.name)}
                  </span>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-sm">{user.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[user.role]}</span>
                  </span>
                  <ChevronDown className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveUpdatesProvider>
  )
}

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="mb-2 hidden px-3 font-mono text-[10px] tracking-[0.14em] text-sidebar-muted uppercase lg:block">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <SidebarLink item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  // end: true makes /admin active only on /admin itself, not on /admin/search too.
  // (We don't use NavLink's className function: the tooltip wrapper would turn it into a string.)
  const isActive = useMatch({ path: item.to, end: true }) !== null
  const link = (
    <Link
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-9 items-center justify-center gap-3 rounded-md px-3 transition-colors lg:justify-start',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
        isActive &&
          'bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden truncate lg:inline">{item.label}</span>
      <span className="sr-only lg:hidden">{item.label}</span>
    </Link>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      {/* Only needed on the icon rail, where the label is hidden. */}
      <TooltipContent side="right" className="lg:hidden">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}
