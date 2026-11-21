import type { TechnicianRecommendation } from '@/api/types'

/**
 * Mirrors Technician.canTakeMoreWork() in the backend: available and below max workload.
 * Assigning anyone else is always refused (409), so the UI should not offer it.
 */
export function canTakeMoreWork(tech: Pick<TechnicianRecommendation, 'available' | 'activeIncidents' | 'maxWorkload'>): boolean {
  return tech.available && tech.activeIncidents < tech.maxWorkload
}

/** Why a technician can't be picked right now, or null if they can. */
export function unassignableReason(
  tech: Pick<TechnicianRecommendation, 'available' | 'activeIncidents' | 'maxWorkload'>,
): string | null {
  if (!tech.available) return 'Unavailable'
  if (tech.activeIncidents >= tech.maxWorkload) return `Full (${tech.activeIncidents}/${tech.maxWorkload})`
  return null
}
