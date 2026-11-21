import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

/**
 * How much of the running SLA window is used, as a bar: amber from 75 %, red from 100 %.
 * `percent` can pass 100 once breached; the bar stops full, the number keeps the real value.
 */
export function SlaUsageBar({ percent, caption, className }: { percent: number; caption?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex justify-between gap-2 text-xs">
        {caption !== undefined && <span className="text-muted-foreground">{caption}</span>}
        <span className="ml-auto font-mono tabular">{percent}%</span>
      </div>
      <Progress
        value={Math.min(percent, 100)}
        aria-label="Share of the SLA window used"
        className={cn(
          percent >= 100 && '[&>[data-slot=progress-indicator]]:bg-sla-breached',
          percent >= 75 && percent < 100 && '[&>[data-slot=progress-indicator]]:bg-sla-warning',
        )}
      />
    </div>
  )
}
