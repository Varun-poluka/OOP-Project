import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/api/types'
import { RISK_LABEL } from '@/lib/labels'

// Risk reuses the SLA colours: it is the backend's forecast of the SLA clock.
const TONE_CLASS: Record<Exclude<RiskLevel, 'NONE'>, string> = {
  LOW: 'border-sla-ok/35 text-sla-ok',
  MEDIUM: 'border-sla-warning/40 text-sla-warning',
  HIGH: 'border-sla-warning/50 bg-sla-warning/12 text-sla-warning font-medium',
  BREACHED: 'border-sla-breached/45 bg-sla-breached/10 text-sla-breached font-medium',
}

/** How close the incident's running SLA clock is to breaching. NONE shows a quiet dash. */
export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  if (risk === 'NONE') {
    return (
      <span className={cn('text-xs text-muted-foreground', className)} title={RISK_LABEL.NONE}>
        —<span className="sr-only">{RISK_LABEL.NONE}</span>
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-sm border px-2 text-xs whitespace-nowrap',
        TONE_CLASS[risk],
        className,
      )}
    >
      {RISK_LABEL[risk]}
    </span>
  )
}
