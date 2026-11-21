import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLiveStatus } from '@/live/useLiveStatus'
import { cn } from '@/lib/utils'

/** Small "Live" / "Reconnecting" pill in the top bar. */
export function LiveIndicator() {
  const status = useLiveStatus()
  const live = status === 'live'
  const label = live ? 'Live' : 'Reconnecting'
  const explanation = live
    ? 'Connected: changes appear as they happen.'
    : 'Live updates are not connected. Retrying; meanwhile the page refreshes every 30 seconds.'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          tabIndex={0}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            aria-hidden
            className={cn('size-2 rounded-full', live ? 'bg-sla-ok' : 'animate-pulse bg-sla-warning')}
          />
          {label}
          <span className="sr-only">. {explanation}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{explanation}</TooltipContent>
    </Tooltip>
  )
}
