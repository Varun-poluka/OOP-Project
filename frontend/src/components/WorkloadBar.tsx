import type { TechnicianResponse } from '@/api/types'
import { cn } from '@/lib/utils'

type WorkloadBarProps = {
  tech: Pick<TechnicianResponse, 'name' | 'activeIncidents' | 'maxWorkload'>
  /** Accessible name of the meter; defaults to "<name> workload". */
  label?: string
  className?: string
}

/** Active incidents out of the maximum; full (no more automatic assignments) is shown in words too. */
export function WorkloadBar({ tech, label, className }: WorkloadBarProps) {
  const percent = tech.maxWorkload > 0 ? Math.min(100, (tech.activeIncidents / tech.maxWorkload) * 100) : 0
  const full = tech.activeIncidents >= tech.maxWorkload
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-mono tabular">
          {tech.activeIncidents} / {tech.maxWorkload} active
        </span>
        {full && <span className="font-medium text-sla-warning">Full</span>}
      </div>
      <div
        role="meter"
        aria-label={label ?? `${tech.name} workload`}
        aria-valuemin={0}
        aria-valuemax={tech.maxWorkload}
        aria-valuenow={tech.activeIncidents}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn('h-full rounded-full', full ? 'bg-sla-warning' : 'bg-primary')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
