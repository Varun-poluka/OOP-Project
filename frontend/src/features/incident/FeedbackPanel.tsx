import { Star } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import { cn } from '@/lib/utils'
import { MAX_RATING, describeRating } from './feedback'
import { Panel } from './Panel'

/** The reporter's rating and comment, given when they verified the fix. Hidden when there is none. */
export function FeedbackPanel({ incident }: { incident: IncidentResponse }) {
  const { feedbackRating: rating, feedbackComment: comment } = incident
  if (rating === null && comment === null) return null
  return (
    <Panel title="Reporter feedback">
      {rating !== null && (
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex">
            {Array.from({ length: MAX_RATING }, (_, index) => (
              <Star
                key={index}
                className={cn('size-4', index < rating ? 'fill-sla-warning text-sla-warning' : 'text-muted-foreground/40')}
              />
            ))}
          </span>
          <span className="text-sm font-medium">{describeRating(rating)}</span>
        </div>
      )}
      {comment !== null && <p className={cn('text-sm whitespace-pre-wrap', rating !== null && 'mt-2')}>“{comment}”</p>}
    </Panel>
  )
}
