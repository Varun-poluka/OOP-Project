import { useState, type FormEvent } from 'react'
import { LoaderCircle, MessageSquarePlus, Send } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'
import { Panel } from './Panel'
import type { ActionCommand } from './useIncidentAction'

type NotesSectionProps = {
  incident: IncidentResponse
  /** The assigned technician may add investigation notes. */
  canAdd: boolean
  /** The reporter may add information (a comment) until the incident is resolved. */
  canComment: boolean
  pending: boolean
  run: (command: ActionCommand, options: { onSuccess: () => void }) => void
}

/** The id the "Information requested" banner links to, so the reporter lands on the reply box. */
export const COMMENT_FORM_ID = 'add-information'

/**
 * Investigation notes and the reporter's comments in one thread, oldest first (they read like a
 * conversation). The reporter's entries are tinted and labelled, so it is clear who said what.
 */
export function NotesSection({ incident, canAdd, canComment, pending, run }: NotesSectionProps) {
  const [text, setText] = useState('')
  const answering = canComment && incident.pendingInfoRequest !== null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text.trim().length === 0) return
    const command: ActionCommand = canComment ? { action: 'comment', text: text.trim() } : { action: 'addNote', text: text.trim() }
    run(command, { onSuccess: () => setText('') })
  }

  return (
    <Panel title={`Notes and comments (${incident.notes.length})`}>
      {incident.notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes or comments yet.</p>
      ) : (
        <ol className="space-y-3">
          {incident.notes.map((note, index) => (
            <li
              key={`${note.createdAt}-${index}`}
              className={cn('rounded-md border p-3', note.fromReporter ? 'ml-6 border-primary/25 bg-primary/5' : 'mr-6 bg-background')}
            >
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{note.authorName}</span>
                <span className="ml-1.5 rounded-sm border px-1 py-px font-mono text-[10px] tracking-wide uppercase">
                  {note.fromReporter ? 'Reporter' : 'Technician'}
                </span>{' '}
                · {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{note.text}</p>
            </li>
          ))}
        </ol>
      )}

      {(canAdd || canComment) && (
        <form id={canComment ? COMMENT_FORM_ID : undefined} onSubmit={submit} className="mt-4 space-y-2 border-t pt-4">
          <Label htmlFor="new-note">{canComment ? (answering ? 'Your answer' : 'Add information') : 'Add a note'}</Label>
          <Textarea
            id="new-note"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={
              canComment
                ? 'Anything that helps: when it happens, error messages, what you tried.'
                : 'What did you check or change?'
            }
          />
          <Button type="submit" variant="outline" size="sm" disabled={pending || text.trim().length === 0}>
            {pending ? <LoaderCircle className="animate-spin" /> : canComment ? <Send /> : <MessageSquarePlus />}
            {canComment ? (answering ? 'Send answer' : 'Add comment') : 'Add note'}
          </Button>
        </form>
      )}
    </Panel>
  )
}
