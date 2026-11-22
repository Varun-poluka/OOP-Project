import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FileQuestion, ShieldX } from 'lucide-react'
import { ApiError } from '@/api/errors'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { IncidentResponse } from '@/api/types'
import { useAuth } from '@/auth/useAuth'
import { homePathFor } from '@/auth/roleHome'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PriorityBadge } from '@/components/PriorityBadge'
import { RiskBadge } from '@/components/RiskBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { ActionBar } from '@/features/incident/ActionBar'
import { AuditTimeline } from '@/features/incident/AuditTimeline'
import { FeedbackPanel } from '@/features/incident/FeedbackPanel'
import { InfoRequestBanner } from '@/features/incident/InfoRequestBanner'
import { ImpactPanel } from '@/features/incident/ImpactPanel'
import { NotesSection } from '@/features/incident/NotesSection'
import { Panel } from '@/features/incident/Panel'
import { RecommendationsPanel } from '@/features/incident/RecommendationsPanel'
import { SlaPanel } from '@/features/incident/SlaPanel'
import { availableActions } from '@/features/incident/actions'
import { useIncidentAction } from '@/features/incident/useIncidentAction'
import { LEVEL_LABEL } from '@/lib/labels'
import { formatDateTime } from '@/lib/time'

export function IncidentDetailPage() {
  // useParams reads the ":id" part of the URL /incidents/:id.
  const { id = '' } = useParams()
  const { user } = useAuth()
  const incident = useQuery({ queryKey: queryKeys.incident(id), queryFn: () => incidentsApi.get(id) })

  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
      <Link to={user === null ? '/' : homePathFor(user.role)}>
        <ArrowLeft />
        Back
      </Link>
    </Button>
  )

  if (incident.isPending) return <LoadingState label="Loading incident…" rows={6} />

  if (incident.isError) {
    const status = incident.error instanceof ApiError ? incident.error.status : 0
    if (status === 403) {
      return (
        <div className="space-y-4">
          {back}
          <EmptyState
            icon={ShieldX}
            title="This incident was reported by someone else"
            description={`You can only open incidents you reported. If ${id} is the same problem as yours, IT already knows about it.`}
          />
        </div>
      )
    }
    if (status === 404) {
      return (
        <div className="space-y-4">
          {back}
          <EmptyState icon={FileQuestion} title="Incident not found" description={`There is no incident ${id}.`} />
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={incident.error} title="Couldn't load this incident" onRetry={() => void incident.refetch()} />
      </div>
    )
  }

  // RequireAuth guarantees a user here.
  if (user === null) return null
  return <IncidentView incident={incident.data} back={back} />
}

function IncidentView({ incident, back }: { incident: IncidentResponse; back: React.ReactNode }) {
  const { user } = useAuth()
  const action = useIncidentAction(incident.id)
  // Every button on this page comes from this one call.
  const actions = user === null ? [] : availableActions(incident, user)
  const run = (command: Parameters<typeof action.mutate>[0], options: { onSuccess: () => void }) =>
    action.mutate(command, { onSuccess: options.onSuccess })

  const assignMode = actions.includes('assign') ? 'assign' : actions.includes('reassign') ? 'reassign' : null

  return (
    <div className="space-y-6">
      {back}

      <header className="space-y-3 border-b pb-5">
        <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground">{incident.id}</p>
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-tight">{incident.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={incident.status} />
          <PriorityBadge priority={incident.priority} showLabel />
          <RiskBadge risk={incident.riskLevel} />
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <Meta label="Reported by" value={incident.reporterName} />
          <Meta label="Technician" value={incident.assignedTechnicianName ?? 'Not assigned yet'} />
          <Meta label="Reported" value={formatDateTime(incident.createdAt)} />
          <Meta label="Impact / urgency" value={`${LEVEL_LABEL[incident.impact]} / ${LEVEL_LABEL[incident.urgency]}`} />
        </dl>
        <ActionBar incident={incident} actions={actions} pending={action.isPending} run={run} />
      </header>

      <InfoRequestBanner incident={incident} isReporter={user !== null && user.id === incident.reporterId} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {incident.resolutionDetails !== null && incident.resolutionDetails.length > 0 && (
            <Panel title="Resolution" className="border-phase-resolved/40">
              <p className="text-sm whitespace-pre-wrap">{incident.resolutionDetails}</p>
            </Panel>
          )}
          <FeedbackPanel incident={incident} />
          <Panel title="Description">
            {incident.description !== null && incident.description.trim().length > 0 ? (
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No description given.</p>
            )}
          </Panel>
          <NotesSection
            incident={incident}
            canAdd={actions.includes('addNote')}
            canComment={actions.includes('comment')}
            pending={action.isPending}
            run={run}
          />
          <AuditTimeline records={incident.auditTrail} />
        </div>

        <div className="space-y-6">
          {assignMode !== null && (
            <RecommendationsPanel incident={incident} mode={assignMode} pending={action.isPending} run={run} />
          )}
          <SlaPanel incident={incident} />
          <ImpactPanel incident={incident} />
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd>{value}</dd>
    </div>
  )
}
