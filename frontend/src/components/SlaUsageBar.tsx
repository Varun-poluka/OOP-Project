import { Progress } from '@/components/ui/progress'
import { formatDuration } from '@/lib/sla'
import { cn } from '@/lib/utils'

type SlaUsageBarProps = {
  /** Share of the running SLA window used; can pass 100 once the deadline is gone. */
  percent: number
  /** How long the running clock is past due (runningOverdueMs); null or missing when it isn't. */
  overdueMs?: number | null
  caption?: string
  className?: string
}

/**
 * How much of the running SLA window is used, as a bar: amber from 75 %, red from 100 %.
 * Past 100 % the bar stays full (it can't grow past its box) and the text switches from the
 * percentage to "Overdue by 2h 10m", which says more than "135 %".
 */
export function SlaUsageBar({ percent, overdueMs, caption, className }: SlaUsageBarProps) {
  const overdue = percent >= 100 && overdueMs !== undefined && overdueMs !== null && overdueMs > 0
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between gap-2 text-xs">
        {caption !== undefined && <span className="text-muted-foreground">{caption}</span>}
        {overdue ? (
          <span className="ml-auto font-medium text-sla-breached" title={`${percent}% of the window used`}>
            Overdue by {formatDuration(overdueMs)}
          </span>
        ) : (
          <span className="ml-auto font-mono tabular">{percent}%</span>
        )}
      </div>
      <Progress
        value={Math.min(Math.max(percent, 0), 100)}
        aria-label="Share of the SLA window used"
        aria-valuetext={overdue ? `Overdue by ${formatDuration(overdueMs)}` : `${percent}%`}
        className={cn(
          percent >= 100 && '[&>[data-slot=progress-indicator]]:bg-sla-breached',
          percent >= 75 && percent < 100 && '[&>[data-slot=progress-indicator]]:bg-sla-warning',
        )}
      />
    </div>
  )
}
