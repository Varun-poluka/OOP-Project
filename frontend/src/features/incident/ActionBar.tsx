import { useState } from 'react'
import { PRIORITIES, type IncidentResponse, type Priority } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRIORITY_LABEL } from '@/lib/labels'
import { ACTION_META, BAR_ACTIONS, type BarAction } from './actionMeta'
import type { IncidentAction } from './actions'
import { toVerifyCommand } from './feedback'
import { FeedbackFields } from './FeedbackFields'
import type { ActionCommand } from './useIncidentAction'

type ActionBarProps = {
  incident: IncidentResponse
  actions: IncidentAction[]
  pending: boolean
  run: (command: ActionCommand, options: { onSuccess: () => void }) => void
}

export function ActionBar({ incident, actions, pending, run }: ActionBarProps) {
  const [open, setOpen] = useState<BarAction | null>(null)
  const [priority, setPriority] = useState<Priority | ''>('')
  const [rating, setRating] = useState<number | null>(null)
  const [feedbackComment, setFeedbackComment] = useState('')
  const shown = BAR_ACTIONS.filter((action) => actions.includes(action))
  if (shown.length === 0) return null

  // The first non-secondary action is the filled (main) button; the rest are outlined.
  const primary = shown.find((action) => ACTION_META[action].secondary !== true)

  function confirm(action: BarAction, text: string) {
    const close = { onSuccess: () => closeDialog() }
    if (action === 'resolve') run({ action, resolutionDetails: text }, close)
    else if (action === 'requestInfo') run({ action, question: text }, close)
    else if (action === 'verify') run(toVerifyCommand(rating, feedbackComment), close)
    else if (action === 'reopen') run({ action, reason: text }, close)
    else if (action === 'classify') {
      if (priority !== '') run({ action, priority }, close)
    } else run({ action }, close)
  }

  // Closing (cancel or success) forgets the feedback, so the next opening starts empty.
  function closeDialog() {
    setOpen(null)
    setRating(null)
    setFeedbackComment('')
  }

  const meta = open === null ? null : ACTION_META[open]

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((action) => {
        const Icon = ACTION_META[action].icon
        return (
          <Button key={action} variant={action === primary ? 'default' : 'outline'} onClick={() => setOpen(action)}>
            <Icon />
            {ACTION_META[action].label}
          </Button>
        )
      })}

      {open !== null && meta !== null && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) closeDialog()
          }}
          title={meta.title}
          description={meta.description(incident)}
          confirmLabel={meta.confirmLabel}
          textInput={meta.text}
          pending={pending}
          canConfirm={open !== 'classify' || priority !== ''}
          onConfirm={(text) => confirm(open, text)}
        >
          {open === 'verify' && (
            <FeedbackFields
              rating={rating}
              comment={feedbackComment}
              onRatingChange={setRating}
              onCommentChange={setFeedbackComment}
            />
          )}
          {open === 'classify' && (
            <div className="space-y-1.5">
              <Label htmlFor="classify-priority">Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as Priority)}>
                <SelectTrigger id="classify-priority" className="w-full">
                  <SelectValue placeholder="Choose a priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} · {PRIORITY_LABEL[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </ConfirmDialog>
      )}
    </div>
  )
}
