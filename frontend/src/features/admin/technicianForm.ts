import type { TechnicianResponse, UpdateTechnicianRequest } from '@/api/types'

// Rules of the technician edit form, mirroring UpdateTechnicianRequest (@Min(1) @Max(50)) and
// Technician.changeMaxWorkload (not below the incidents the technician is working on).
export const MAX_WORKLOAD_LIMIT = 50

export type TechnicianFormState = {
  skills: string[]
  onLeave: boolean
  /** Text from the number box, so an empty box is '' rather than 0. */
  maxWorkload: string
}

export function formStateOf(tech: TechnicianResponse): TechnicianFormState {
  return { skills: [...tech.skills], onLeave: !tech.available, maxWorkload: String(tech.maxWorkload) }
}

/** The message to show under "Max workload", or null when the value is fine. */
export function maxWorkloadError(value: string, activeIncidents: number): string | null {
  if (!/^\d+$/.test(value.trim())) return 'Enter a whole number.'
  const number = Number(value)
  if (number < 1 || number > MAX_WORKLOAD_LIMIT) return `Use a number from 1 to ${MAX_WORKLOAD_LIMIT}.`
  if (number < activeIncidents) return `At least ${activeIncidents}: the technician is working on ${activeIncidents} incidents.`
  return null
}

export function toUpdateRequest(state: TechnicianFormState): UpdateTechnicianRequest {
  return {
    skills: [...state.skills].sort(),
    available: !state.onLeave,
    maxWorkload: Number(state.maxWorkload),
  }
}

export function toggleSkill(skills: string[], name: string): string[] {
  return skills.includes(name) ? skills.filter((skill) => skill !== name) : [...skills, name]
}
