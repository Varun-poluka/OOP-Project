import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ListTodo } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { IncidentResponse, UserResponse } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { QueryState } from '@/components/QueryState'
import { RiskBadge } from '@/components/RiskBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { UrgentClockBadge } from '@/components/UrgentClockBadge'
import { Button } from '@/components/ui/button'
import { ACTION_META } from '@/features/incident/actionMeta'
import { availableActions } from '@/features/incident/actions'
import { useIncidentAction } from '@/features/incident/useIncidentAction'
import { usePollWhileOffline } from '@/live/useLiveStatus'
import { cn } from '@/lib/utils'

/** The actions offered right in the queue row; everything else is on the detail page. */
type QuickAction = 'acknowledge' | 'start'
const QUICK_ACTIONS: QuickAction[] = ['acknowledge', 'start']

export function MyQueuePage() {
  const { user } = useAuth()
  // Live "incident" events invalidate this query (its key is under ['incidents', 'list']),
  // so a newly assigned incident appears without a reload.
  const queue = useQuery({
    queryKey: queryKeys.queue(),
    queryFn: incidentsApi.queue,
    refetchInterval: usePollWhileOffline(),
  })

  // RequireAuth renders us only when logged in.
  if (user === null) return null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Technician"
        title="My queue"
        description={
          queue.isSuccess && queue.data.length > 0
            ? `${queue.data.length} unfinished, most urgent SLA first.`
            : 'Incidents assigned to you, most urgent SLA first.'
        }
      />

      <QueryState
        query={queue}
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon={ListTodo}
            title="Your queue is empty"
            description="Incidents assigned to you show up here as soon as an admin assigns them."
          />
        }
      >
        {(incidents) => (
          <div className="overflow-x-auto rounded-lg border bg-card">
            {/* min-w-[42rem] fits a tablet (820 px) without scrolling, so the action buttons stay
                in view; narrower screens scroll the table sideways inside its border. */}
            <table className="w-full min-w-[42rem] text-left">
              <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">Incident</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">SLA</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Risk</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.map((incident) => (
                  <QueueRow key={incident.id} incident={incident} user={user} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  )
}

/** One row. Its own component because each row needs its own useIncidentAction hook. */
function QueueRow({ incident, user }: { incident: IncidentResponse; user: UserResponse }) {
  const navigate = useNavigate()
  const action = useIncidentAction(incident.id)
  const [confirming, setConfirming] = useState<QuickAction | null>(null)
  const path = `/incidents/${encodeURIComponent(incident.id)}`

  const allowed = availableActions(incident, user)
  const quick = QUICK_ACTIONS.filter((a) => allowed.includes(a))
  const meta = confirming === null ? null : ACTION_META[confirming]

  return (
    <tr
      onClick={() => navigate(path)}
      className={cn(
        'cursor-pointer align-middle transition-colors hover:bg-muted/40',
        // A thin red edge marks P1 (critical) rows; transparent otherwise so all rows line up.
        incident.priority === 'P1' ? 'border-l-2 border-l-p1' : 'border-l-2 border-l-transparent',
      )}
    >
      <td className="px-4 py-3">
        <p className="font-mono text-xs text-muted-foreground">{incident.id}</p>
        <Link
          to={path}
          onClick={(event) => event.stopPropagation()}
          className="mt-0.5 line-clamp-1 font-medium hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {incident.title}
        </Link>
        <p className="text-xs text-muted-foreground">
          {incident.serviceName} · {incident.reporterName}
        </p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={incident.status} />
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={incident.priority} />
      </td>
      <td className="px-4 py-3">
        <UrgentClockBadge incident={incident} />
      </td>
      <td className="px-4 py-3">
        <RiskBadge risk={incident.riskLevel} />
      </td>
      {/* Clicks here must not open the row. The dialog renders in a portal, but React still
          bubbles its events through this cell, so stopping them here covers the dialog too. */}
      <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
        {quick.map((name) => {
          const Icon = ACTION_META[name].icon
          return (
            <Button key={name} size="sm" variant="outline" onClick={() => setConfirming(name)}>
              <Icon />
              {ACTION_META[name].label}
            </Button>
          )
        })}
        {confirming !== null && meta !== null && (
          <ConfirmDialog
            open
            onOpenChange={(next) => {
              if (!next) setConfirming(null)
            }}
            title={meta.title}
            description={meta.description(incident)}
            confirmLabel={meta.confirmLabel}
            pending={action.isPending}
            onConfirm={() => action.mutate({ action: confirming }, { onSuccess: () => setConfirming(null) })}
          />
        )}
      </td>
    </tr>
  )
}
