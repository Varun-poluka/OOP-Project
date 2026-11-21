import type { IncidentResponse } from '@/api/types'

type RiskFields = Pick<IncidentResponse, 'riskLevel' | 'slaPercentUsed'>

/**
 * Order for the At risk page: breached incidents first, then by how much of the SLA window
 * is used (most first); incidents without a running clock (null) go last.
 * Returns a new array; the input (cached query data) is never changed in place.
 */
export function sortAtRisk<T extends RiskFields>(incidents: readonly T[]): T[] {
  return [...incidents].sort((a, b) => {
    const breachedA = a.riskLevel === 'BREACHED'
    const breachedB = b.riskLevel === 'BREACHED'
    if (breachedA !== breachedB) return breachedA ? -1 : 1
    if (a.slaPercentUsed === b.slaPercentUsed) return 0
    if (a.slaPercentUsed === null) return 1
    if (b.slaPercentUsed === null) return -1
    return b.slaPercentUsed - a.slaPercentUsed
  })
}
