import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ArrowRight, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/api/errors'
import { INCIDENT_STATUSES } from '@/api/types'
import { postLoginPath } from '@/auth/roleHome'
import { useAuth } from '@/auth/useAuth'
import { STATUS_LABEL } from '@/lib/labels'

/** RequireAuth passes the page the user wanted, so we can return there after login. */
type LoginLocationState = { from?: string } | null

export function LoginPage() {
  const { user, login, lastLogoutReason } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LoginLocationState

  // "Controlled inputs": React state holds the field values; each keystroke updates it.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already logged in (e.g. pressed Back to /login): go straight to the right page.
  if (user !== null) return <Navigate to={postLoginPath(user.role, state?.from)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser's own full-page form submit
    if (email.trim().length === 0 || password.length === 0) {
      setError('Enter your email and password.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const loggedIn = await login(email.trim(), password)
      navigate(postLoginPath(loggedIn.role, state?.from), { replace: true })
    } catch (caught) {
      setError(errorMessage(caught))
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <LifecyclePanel />

      <div className="relative flex flex-col items-center justify-center px-6 py-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <p className="font-semibold">I-ITSM Service Desk</p>
          </div>

          <h1 className="text-[1.6rem] leading-tight font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-muted-foreground">Use your work email to report or work on incidents.</p>

          {lastLogoutReason === 'expired' && (
            <p className="mt-6 flex items-start gap-2 rounded-md border bg-muted px-3 py-2.5 text-sm">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              Your session ended. Please sign in again.
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10"
              />
            </div>

            {error !== null && (
              <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" className="h-10 w-full" disabled={submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              {submitting ? 'Signing in…' : 'Sign in'}
              {!submitting && <ArrowRight />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

/** Left panel (desktop only): the incident lifecycle, set like a departures board. */
function LifecyclePanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
      {/* faint grid, like graph paper on an operations wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative flex items-center gap-3">
        <BrandMark />
        <div className="leading-tight">
          <p className="font-semibold text-sidebar-accent-foreground">I-ITSM</p>
          <p className="font-mono text-[10px] tracking-[0.14em] text-sidebar-muted uppercase">Service desk</p>
        </div>
      </div>

      <div className="relative">
        <p className="font-mono text-[11px] tracking-[0.14em] text-sidebar-muted uppercase">Incident lifecycle</p>
        <ol className="mt-4 space-y-px">
          {INCIDENT_STATUSES.map((status, index) => (
            <li
              key={status}
              className="flex items-baseline gap-4 border-b border-sidebar-border py-2 font-mono text-sm"
            >
              <span className="w-6 text-sidebar-muted tabular">{String(index + 1).padStart(2, '0')}</span>
              <span className="text-sidebar-accent-foreground">{STATUS_LABEL[status]}</span>
              <span className="ml-auto text-[11px] text-sidebar-muted">{status}</span>
            </li>
          ))}
        </ol>
        <p className="mt-8 max-w-sm text-[1.35rem] leading-snug font-medium text-sidebar-accent-foreground">
          Every report classified, assigned and tracked against its SLA, from first call to closure.
        </p>
      </div>

      <p className="relative font-mono text-[11px] text-sidebar-muted">CS F213 · Object-Oriented Programming</p>
    </aside>
  )
}
