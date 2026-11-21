import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/api/errors'

type ErrorStateProps = {
  /** Whatever was thrown; usually an ApiError whose message is already readable. */
  error: unknown
  title?: string
  /** Shows a "Try again" button, e.g. TanStack Query's refetch. */
  onRetry?: () => void
}

export function ErrorState({ error, title = "Couldn't load this", onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {onRetry !== undefined && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
