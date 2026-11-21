import type { IncidentStatus, Priority } from '@/api/types'

// Sample rows for the placeholder pages' previews only. Removed once pages load real data.

/** Formats a Date the way the backend sends LocalDateTime: "2026-11-21T10:00:00". */
export function toLocalDateTimeString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

const minutesFromNow = (minutes: number) => toLocalDateTimeString(new Date(Date.now() + minutes * 60_000))

export type SampleIncident = {
  id: string
  title: string
  serviceName: string
  status: IncidentStatus
  priority: Priority | null
  resolutionDueAt: string | null
  resolutionBreached: boolean
}

export function sampleIncidents(): SampleIncident[] {
  return [
    {
      id: 'INC-1042',
      title: 'VPN drops every few minutes for the finance team',
      serviceName: 'Remote access',
      status: 'IN_PROGRESS',
      priority: 'P1',
      resolutionDueAt: minutesFromNow(38),
      resolutionBreached: false,
    },
    {
      id: 'INC-1039',
      title: 'Shared mailbox not syncing on Outlook',
      serviceName: 'Email',
      status: 'ACKNOWLEDGED',
      priority: 'P2',
      resolutionDueAt: minutesFromNow(4 * 60 + 12),
      resolutionBreached: false,
    },
    {
      id: 'INC-1031',
      title: 'Printer on floor 3 shows paper jam with no paper inside',
      serviceName: 'Printing',
      status: 'ASSIGNED',
      priority: 'P3',
      resolutionDueAt: minutesFromNow(2 * 24 * 60 + 5 * 60),
      resolutionBreached: false,
    },
    {
      id: 'INC-1027',
      title: 'Request for a second monitor',
      serviceName: 'Hardware',
      status: 'IN_PROGRESS',
      priority: 'P4',
      resolutionDueAt: minutesFromNow(-95),
      resolutionBreached: true,
    },
  ]
}
