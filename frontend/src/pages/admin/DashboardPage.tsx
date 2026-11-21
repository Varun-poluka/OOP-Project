import { Link, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import { reportsApi } from '@/api/reports'
import type { ReportSummary } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { QueryState } from '@/components/QueryState'
import { UrgentClockBadge } from '@/components/UrgentClockBadge'
import { Button } from '@/components/ui/button'
import {
  ChartCard,
  ComplianceChart,
  CountChart,
  PriorityCountChart,
  WorkloadChart,
} from '@/features/dashboard/charts'
import {
  RANGE_PRESETS,
  matchingPreset,
  presetRange,
  readRange,
  toReportQuery,
  writeRange,
  type DateRange,
} from '@/features/dashboard/dashboardRange'
import {
  NO_DATA,
  categoryBars,
  complianceBars,
  formatMinutes,
  formatPercent,
  kpis,
  priorityBars,
  statusBars,
  workloadBars,
} from '@/features/dashboard/reportCharts'
import { sortAtRisk } from '@/features/incidents/atRisk'
import { usePollWhileOffline } from '@/live/useLiveStatus'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/utils'

const NEEDS_ATTENTION_COUNT = 5

/**
 * The admin's overview, from GET /api/reports/summary. The date range is in the URL, so a
 * chosen view survives a reload. A live "incident" event refreshes the report (see
 * eventToInvalidations), so the numbers move while you watch.
 */
export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // useNow re-reads the clock every minute, so the presets roll over at midnight by themselves.
  const todayMs = useNow(60_000)
  const range = readRange(searchParams, todayMs)
  const preset = matchingPreset(range, todayMs)
  const { from, to } = toReportQuery(range)

  const report = useQuery({
    queryKey: queryKeys.report(from, to),
    queryFn: () => reportsApi.summary(from, to),
    placeholderData: keepPreviousData, // keep the old figures on screen while a new range loads
    refetchInterval: usePollWhileOffline(),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Dashboard"
        description="Volume, SLA compliance and technician workload."
        actions={<RangeSelector range={range} preset={preset} todayMs={todayMs} onChange={(next) => setSearchParams(writeRange(next))} />}
      />

      <QueryState query={report} errorTitle="Could not load the report">
        {(summary) => (
          <div className={cn('space-y-6 transition-opacity', report.isPlaceholderData && 'opacity-60')}>
            <KpiTiles summary={summary} />

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <Charts summary={summary} />
              </div>
              <NeedsAttention />
            </div>
          </div>
        )}
      </QueryState>
    </div>
  )
}

function RangeSelector({
  range,
  preset,
  todayMs,
  onChange,
}: {
  range: DateRange
  preset: number | null
  todayMs: number
  onChange: (range: DateRange) => void
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div role="group" aria-label="Date range" className="inline-flex rounded-md border bg-card p-0.5">
        {RANGE_PRESETS.map((days) => (
          <Button
            key={days}
            size="sm"
            variant={preset === days ? 'secondary' : 'ghost'}
            aria-pressed={preset === days}
            onClick={() => onChange(presetRange(days, todayMs))}
          >
            {days} days
          </Button>
        ))}
      </div>
      <p className="font-mono text-xs text-muted-foreground tabular">
        {range.from} → {range.to}
      </p>
    </div>
  )
}

function KpiTiles({ summary }: { summary: ReportSummary }) {
  const values = kpis(summary)
  const inRange = 'In the selected range' // the dates themselves are under the range buttons
  const tiles: { label: string; value: string; note: string; tone?: 'p1' }[] = [
    { label: 'Open incidents', value: String(values.openNow), note: 'Right now' },
    { label: 'Open P1', value: String(values.openP1Now), note: 'Right now', tone: values.openP1Now > 0 ? 'p1' : undefined },
    { label: 'Response SLA met', value: formatPercent(values.responseCompliance), note: inRange },
    { label: 'Resolution SLA met', value: formatPercent(values.resolutionCompliance), note: inRange },
    { label: 'Mean time to acknowledge', value: formatMinutes(values.meanMinutesToAcknowledge), note: inRange },
    { label: 'Mean time to resolve', value: formatMinutes(values.meanMinutesToResolve), note: inRange },
  ]
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-card px-4 py-4">
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd
            className={cn(
              'mt-1 font-mono text-2xl tabular',
              tile.value === NO_DATA && 'text-base text-muted-foreground',
              tile.tone === 'p1' && 'text-p1',
            )}
          >
            {tile.value}
          </dd>
          <dd className="mt-1 text-[11px] text-muted-foreground">{tile.note}</dd>
        </div>
      ))}
    </dl>
  )
}

function Charts({ summary }: { summary: ReportSummary }) {
  if (summary.totalIncidents === 0) {
    return (
      <EmptyState
        title="No incidents reported in this range"
        description="Pick a longer range to see counts, SLA compliance and workload."
      />
    )
  }
  const status = statusBars(summary)
  const priority = priorityBars(summary)
  const category = categoryBars(summary)
  const response = complianceBars(summary, 'response')
  const resolution = complianceBars(summary, 'resolution')
  const workload = workloadBars(summary)
  const percentCell = (value: number | null) => (value === null ? NO_DATA : `${value}%`)
  const subtitle = `${summary.totalIncidents} incidents reported in the selected range`

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Where are incidents in their lifecycle?"
          subtitle={subtitle}
          table={{ headers: ['Status', 'Incidents'], rows: status.map((row) => [row.label, row.count]) }}
        >
          <CountChart rows={status} />
        </ChartCard>
        <ChartCard
          title="How urgent are they?"
          subtitle={subtitle}
          table={{ headers: ['Priority', 'Incidents'], rows: priority.map((row) => [row.label, row.count]) }}
        >
          <PriorityCountChart rows={priority} />
        </ChartCard>
      </div>

      <ChartCard
        title="Which categories break most often?"
        subtitle={subtitle}
        table={{ headers: ['Category', 'Incidents'], rows: category.map((row) => [row.label, row.count]) }}
      >
        <CountChart rows={category} labelWidth={140} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Are we responding in time?"
          subtitle="Response SLA met, per priority"
          table={{
            headers: ['Priority', 'Met', 'Incidents'],
            rows: response.map((row) => [row.priority, percentCell(row.percent), row.incidents]),
          }}
        >
          <ComplianceChart rows={response} />
        </ChartCard>
        <ChartCard
          title="Are we resolving in time?"
          subtitle="Resolution SLA met, per priority"
          table={{
            headers: ['Priority', 'Met', 'Incidents'],
            rows: resolution.map((row) => [row.priority, percentCell(row.percent), row.incidents]),
          }}
        >
          <ComplianceChart rows={resolution} />
        </ChartCard>
      </div>

      <ChartCard
        title="Who is carrying the work?"
        subtitle="Open and resolved incidents per technician, from incidents reported in the selected range"
        table={{
          headers: ['Technician', 'Open', 'Resolved', 'Available'],
          rows: workload.map((row) => [row.name, row.open, row.resolved, row.available ? 'yes' : 'no']),
        }}
      >
        <WorkloadChart rows={workload} />
      </ChartCard>
    </>
  )
}

/** The five incidents closest to (or past) breaching, from GET /api/incidents/at-risk. */
function NeedsAttention() {
  const atRisk = useQuery({
    queryKey: queryKeys.atRisk(),
    queryFn: incidentsApi.atRisk,
    refetchInterval: usePollWhileOffline(),
    select: (incidents) => sortAtRisk(incidents).slice(0, NEEDS_ATTENTION_COUNT),
  })
  return (
    <section className="h-fit rounded-lg border bg-card p-4">
      <h2 className="font-medium">Needs attention</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Right now: breached first, then by SLA time used</p>
      <div className="mt-3">
        <QueryState
          query={atRisk}
          isEmpty={(data) => data.length === 0}
          empty={<EmptyState icon={ShieldCheck} title="Nothing at risk" className="py-8" />}
          loading={<p className="text-sm text-muted-foreground">Loading…</p>}
        >
          {(incidents) => (
            <ul className="divide-y">
              {incidents.map((incident) => (
                <li key={incident.id} className="py-2.5">
                  <Link to={`/incidents/${encodeURIComponent(incident.id)}`} className="group block">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{incident.id}</span>
                      <PriorityBadge priority={incident.priority} className="h-5" />
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm font-medium group-hover:underline">{incident.title}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {incident.assignedTechnicianName ?? 'Unassigned'}
                      </span>
                      <UrgentClockBadge incident={incident} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>
    </section>
  )
}
