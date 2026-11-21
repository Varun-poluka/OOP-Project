import type { SlaState } from './sla'

/** Colours per SLA state; shared by SlaCountdown and UrgentClockBadge. */
export const SLA_TONE_CLASS: Record<SlaState, string> = {
  none: 'text-muted-foreground',
  ok: 'text-sla-ok',
  warning: 'border-sla-warning/40 bg-sla-warning/10 text-sla-warning',
  breached: 'border-sla-breached/40 bg-sla-breached/10 text-sla-breached',
}
