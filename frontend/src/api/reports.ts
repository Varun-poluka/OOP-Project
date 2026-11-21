import { apiFetch } from './client'
import type { LocalDateTimeString, ReportSummary } from './types'

export const reportsApi = {
  summary: (from?: LocalDateTimeString, to?: LocalDateTimeString) =>
    apiFetch<ReportSummary>('/api/reports/summary', { query: { from, to } }),
}
