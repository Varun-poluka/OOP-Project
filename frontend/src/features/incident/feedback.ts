// Rules for the optional feedback given when the reporter verifies a fix.
// Mirrors Incident.MIN_RATING / MAX_RATING and VerifyRequest's @Size(max = 2000) on the backend.

export const MIN_RATING = 1
export const MAX_RATING = 5
export const FEEDBACK_COMMENT_MAX = 2000

export const RATING_LABEL: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
}

export type VerifyCommand = { action: 'verify'; rating?: number; comment?: string }

/** Builds the verify command: no rating and a blank comment send no feedback at all. */
export function toVerifyCommand(rating: number | null, comment: string): VerifyCommand {
  const command: VerifyCommand = { action: 'verify' }
  if (rating !== null) {
    if (!Number.isInteger(rating) || rating < MIN_RATING || rating > MAX_RATING) {
      throw new RangeError(`Rating must be ${MIN_RATING}-${MAX_RATING}`)
    }
    command.rating = rating
  }
  const trimmed = comment.trim()
  if (trimmed.length > 0) command.comment = trimmed
  return command
}

/** "4/5 · Very good" for the feedback panel. */
export function describeRating(rating: number): string {
  return `${rating}/${MAX_RATING} · ${RATING_LABEL[rating] ?? ''}`.trim()
}
