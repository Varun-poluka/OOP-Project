// Checks an SLA policy edit before it is sent. The backend checks @Positive too; checking here
// means the admin sees the problem next to the field, before any request.

export type PolicyDraft = { responseMinutes: string; resolutionMinutes: string }

export type PolicyErrors = { responseMinutes?: string; resolutionMinutes?: string }

export type PolicyValidation =
  | { ok: true; value: { responseMinutes: number; resolutionMinutes: number } }
  | { ok: false; errors: PolicyErrors }

/** The largest value a Java int holds; the backend stores minutes as int. */
const MAX_MINUTES = 2_147_483_647

function parseMinutes(text: string): { minutes: number } | { error: string } {
  const trimmed = text.trim()
  if (trimmed === '') return { error: 'Enter a number of minutes.' }
  // Digits only: rejects "1.5", "-3", "1e3" and "15 min", which Number() would partly accept.
  if (!/^\d+$/.test(trimmed)) return { error: 'Use whole minutes (no decimals or units).' }
  const minutes = Number(trimmed)
  if (minutes < 1) return { error: 'Must be at least 1 minute.' }
  if (minutes > MAX_MINUTES) return { error: 'That number is too large.' }
  return { minutes }
}

/**
 * Valid when both are whole minutes >= 1 and resolution >= response
 * (an incident can't be due to be fixed before it is due to be answered).
 */
export function validatePolicyDraft(draft: PolicyDraft): PolicyValidation {
  const response = parseMinutes(draft.responseMinutes)
  const resolution = parseMinutes(draft.resolutionMinutes)
  const errors: PolicyErrors = {}
  if ('error' in response) errors.responseMinutes = response.error
  if ('error' in resolution) errors.resolutionMinutes = resolution.error
  if ('minutes' in response && 'minutes' in resolution && resolution.minutes < response.minutes) {
    errors.resolutionMinutes = 'Must be at least the response time.'
  }
  if (errors.responseMinutes !== undefined || errors.resolutionMinutes !== undefined) return { ok: false, errors }
  // Both parsed (otherwise there would be an error above); the casts only tell TypeScript so.
  return {
    ok: true,
    value: {
      responseMinutes: (response as { minutes: number }).minutes,
      resolutionMinutes: (resolution as { minutes: number }).minutes,
    },
  }
}

/** 240 -> "4h", 90 -> "1h 30m", 2880 -> "2d": a readable echo next to the raw minutes. */
export function describeMinutes(minutes: number): string {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (rest > 0) parts.push(`${rest}m`)
  return parts.length === 0 ? '0m' : parts.join(' ')
}
