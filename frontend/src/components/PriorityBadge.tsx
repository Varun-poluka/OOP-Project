import { cn } from '@/lib/utils'
import type { Priority } from '@/api/types'
import { PRIORITY_LABEL } from '@/lib/labels'

const TONE_CLASS: Record<Priority, string> = {
  P1: 'border-p1/35 bg-p1/10 text-p1',
  P2: 'border-p2/35 bg-p2/10 text-p2',
  P3: 'border-p3/30 bg-p3/8 text-p3',
  P4: 'border-p4/30 bg-p4/8 text-p4',
}

type PriorityBadgeProps = {
  /** null means "not classified yet" (the backend sets priority during classification). */
  priority: Priority | null
  /** Show the word ("Critical") next to the code ("P1"). */
  showLabel?: boolean
  className?: string
}

export function PriorityBadge({ priority, showLabel = false, className }: PriorityBadgeProps) {
  if (priority === null) {
    return (
      <span
        className={cn(
          'inline-flex h-6 items-center rounded-sm border border-dashed px-2 text-xs text-muted-foreground',
          className,
        )}
      >
        Unclassified
      </span>
    )
  }
  return (
    <span
      title={`${priority} · ${PRIORITY_LABEL[priority]}`}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 text-xs font-medium whitespace-nowrap',
        TONE_CLASS[priority],
        className,
      )}
    >
      <span className="font-mono font-medium">{priority}</span>
      {showLabel && <span>{PRIORITY_LABEL[priority]}</span>}
    </span>
  )
}
