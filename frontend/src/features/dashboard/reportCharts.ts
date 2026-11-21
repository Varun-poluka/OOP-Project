import {
  INCIDENT_STATUSES,
  PRIORITIES,
  type CountRow,
  type Priority,
  type ReportSummary,
  type SlaSummary,
} from '@/api/types'
import { formatDuration } from '@/lib/sla'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'

// Pure functions that turn the backend's ReportSummary into the rows each chart draws.
// Keeping them out of the components means the numbers can be unit-tested without rendering,
// and a chart component only decides *how* to draw, never *what* to count.

export type CountBar = { key: string; label: string; count: number }

/** Looks up a count by key; keys the backend left out (nothing counted) are 0. */
function countOf(rows: CountRow[], key: string): number {
  for (const row of rows) {
    if (row.key === key) return row.count
  }
  return 0
}

/** Every status in lifecycle order, zeros included, so the bars always read left to right as the flow. */
export function statusBars(summary: ReportSummary): CountBar[] {
  return INCIDENT_STATUSES.map((status) => ({
    key: status,
    label: STATUS_LABEL[status],
    count: countOf(summary.byStatus, status),
  }))
}

export type PriorityBar = CountBar & { priority: Priority | null }

/** P1 to P4 in order, then "Unclassified" only when some incidents have no priority yet. */
export function priorityBars(summary: ReportSummary): PriorityBar[] {
  const bars: PriorityBar[] = PRIORITIES.map((priority) => ({
    key: priority,
    label: `${priority} · ${PRIORITY_LABEL[priority]}`,
    count: countOf(summary.byPriority, priority),
    priority,
  }))
  const unclassified = countOf(summary.byPriority, 'UNCLASSIFIED')
  if (unclassified > 0) bars.push({ key: 'UNCLASSIFIED', label: 'Unclassified', count: unclassified, priority: null })
  return bars
}

/** Categories with at least one incident, most first; ties by name so the order never jumps. */
export function categoryBars(summary: ReportSummary): CountBar[] {
  return summary.byCategory
    .filter((row) => row.count > 0)
    .map((row) => ({ key: row.key, label: row.key, count: row.count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export type ComplianceBar = {
  priority: Priority
  label: string
  /** 0-100, or null when no incident of this priority had that clock finish ("No data", never 0). */
  percent: number | null
  /** How many incidents of this priority the range holds (for the tooltip). */
  incidents: number
}

/** Response or resolution compliance for P1 to P4. */
export function complianceBars(summary: ReportSummary, clock: 'response' | 'resolution'): ComplianceBar[] {
  return PRIORITIES.map((priority) => {
    const sla: SlaSummary | undefined = summary.byPriorityPerformance[priority]
    const value = sla === undefined ? null : clock === 'response' ? sla.responseCompliance : sla.resolutionCompliance
    return {
      priority,
      label: priority,
      percent: value === null ? null : roundTo(value, 1),
      incidents: sla === undefined ? 0 : sla.incidents,
    }
  })
}

export type WorkloadBar = { id: string; name: string; available: boolean; open: number; resolved: number }

/** One row per technician, most open work first, then by name. */
export function workloadBars(summary: ReportSummary): WorkloadBar[] {
  return summary.technicians
    .map((tech) => ({
      id: tech.id,
      name: tech.name,
      available: tech.available,
      open: tech.openIncidents,
      resolved: tech.resolvedIncidents,
    }))
    .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name))
}

export type Kpis = {
  /** Right now (not limited to the range). */
  openNow: number
  openP1Now: number
  /** In the selected range; null means there is nothing to measure yet. */
  responseCompliance: number | null
  resolutionCompliance: number | null
  meanMinutesToAcknowledge: number | null
  meanMinutesToResolve: number | null
}

export function kpis(summary: ReportSummary): Kpis {
  return {
    openNow: summary.openIncidents,
    openP1Now: summary.openByPriority.P1,
    responseCompliance: summary.overall.responseCompliance,
    resolutionCompliance: summary.overall.resolutionCompliance,
    meanMinutesToAcknowledge: summary.overall.meanMinutesToAcknowledge,
    meanMinutesToResolve: summary.overall.meanMinutesToResolve,
  }
}

export const NO_DATA = 'No data'

/** "92.5%"; null is "No data" (no incident to measure), which is not the same as 0%. */
export function formatPercent(value: number | null): string {
  if (value === null) return NO_DATA
  return `${roundTo(value, 1)}%`
}

/** A mean time in minutes as "1h 25m" / "3d 2h" / "<1m"; null is "No data". */
export function formatMinutes(value: number | null): string {
  if (value === null) return NO_DATA
  return formatDuration(value * 60_000)
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
