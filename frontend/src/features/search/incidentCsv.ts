import type { IncidentResponse } from '@/api/types'
import type { CsvColumn } from '@/lib/csv'

/** The columns of "Export CSV": the fields people filter and sort by, plus the SLA outcome. */
export const INCIDENT_CSV_COLUMNS: CsvColumn<IncidentResponse>[] = [
  { header: 'ID', value: (i) => i.id },
  { header: 'Title', value: (i) => i.title },
  { header: 'Status', value: (i) => i.status },
  { header: 'Priority', value: (i) => i.priority ?? 'UNCLASSIFIED' },
  { header: 'Category', value: (i) => i.categoryName },
  { header: 'Service', value: (i) => i.serviceName },
  { header: 'Reporter', value: (i) => i.reporterName },
  { header: 'Technician', value: (i) => i.assignedTechnicianName },
  { header: 'Created at', value: (i) => i.createdAt },
  { header: 'Response due', value: (i) => i.responseDueAt },
  { header: 'Resolution due', value: (i) => i.resolutionDueAt },
  { header: 'Response breached', value: (i) => (i.responseBreached ? 'yes' : 'no') },
  { header: 'Resolution breached', value: (i) => (i.resolutionBreached ? 'yes' : 'no') },
  { header: 'Risk', value: (i) => i.riskLevel },
]
