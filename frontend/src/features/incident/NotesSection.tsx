import { useState, type FormEvent } from 'react'
import { LoaderCircle, MessageSquarePlus } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime } from '@/lib/time'
import { Panel } from './Panel'
import type { ActionCommand } from './useIncidentAction'

type NotesSectionProps = {
  incident: IncidentResponse
  canAdd: boolean
  pending: boolean
  run: (command: ActionCommand, options: { onSuccess: () => void }) => void
}

/** Investigation notes, oldest first (they read like a log), plus the add-note form for the technician. */
export function NotesSection({ incident, canAdd, pending, run }: NotesSectionProps) {
  const [text, setText] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (text.trim().length === 0) return
    run({ action: 'addNote', text: text.trim() }, { onSuccess: () => setText('') })
  }

  return (
    <Panel title={`Notes (${incident.notes.length})`}>
      {incident.notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No investigation notes yet.</p>
      ) : (
        <ol className="space-y-3">
          {incident.notes.map((note, index) => (
            <li key={`${note.createdAt}-${index}`} className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{note.authorName}</span> · {formatDateTime(note.createdAt)}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{note.text}</p>
            </li>
          ))}
        </ol>
      )}

      {canAdd && (
        <form onSubmit={submit} className="mt-4 space-y-2 border-t pt-4">
          <Label htmlFor="new-note">Add a note</Label>
          <Textarea
            id="new-note"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What did you check or change?"
          />
          <Button type="submit" variant="outline" size="sm" disabled={pending || text.trim().length === 0}>
            {pending ? <LoaderCircle className="animate-spin" /> : <MessageSquarePlus />}
            Add note
          </Button>
        </form>
      )}
    </Panel>
  )
}
