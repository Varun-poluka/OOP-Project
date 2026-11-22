import { useId } from 'react'
import { Star } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { FEEDBACK_COMMENT_MAX, MAX_RATING, RATING_LABEL } from './feedback'

type FeedbackFieldsProps = {
  rating: number | null
  comment: string
  onRatingChange: (rating: number | null) => void
  onCommentChange: (comment: string) => void
}

const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

/**
 * Optional rating (1-5 stars) and comment, shown inside the "Is the problem fixed?" dialog.
 * The parent keeps the values. The stars are a radio group: arrow keys are not wired up, but each
 * star is its own button with a name, so keyboard and screen-reader users can pick one with Tab.
 * Clicking the chosen star again clears the rating.
 */
export function FeedbackFields({ rating, comment, onRatingChange, onCommentChange }: FeedbackFieldsProps) {
  const commentId = useId()
  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-1.5">
        <p id={`${commentId}-rating`} className="text-sm font-medium">
          How was the service? <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <div className="flex items-center gap-3">
          <div role="radiogroup" aria-labelledby={`${commentId}-rating`} className="flex gap-0.5">
            {STARS.map((value) => {
              const filled = rating !== null && value <= rating
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value === 1 ? '' : 's'}, ${RATING_LABEL[value]}`}
                  onClick={() => onRatingChange(rating === value ? null : value)}
                  className="rounded-sm p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Star
                    aria-hidden
                    className={cn('size-6 transition-colors', filled ? 'fill-sla-warning text-sla-warning' : 'text-muted-foreground/50')}
                  />
                </button>
              )
            })}
          </div>
          <span className="text-sm text-muted-foreground" aria-live="polite">
            {rating === null ? 'No rating' : RATING_LABEL[rating]}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={commentId}>
          Comment <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={commentId}
          rows={3}
          maxLength={FEEDBACK_COMMENT_MAX}
          value={comment}
          placeholder="Anything the technician or IT should know?"
          onChange={(event) => onCommentChange(event.target.value)}
        />
      </div>
    </div>
  )
}
