import { useState, type ComponentType } from 'react'
import { CheckCheck, CircleCheckBig, Hand, Lock, Play, RotateCcw, Tags } from 'lucide-react'
import { PRIORITIES, type IncidentResponse, type Priority } from '@/api/types'
import { ConfirmDialog, type ConfirmTextInput } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PRIORITY_LABEL } from '@/lib/labels'
import type { IncidentAction } from './actions'
import type { ActionCommand } from './useIncidentAction'

/** The actions this bar handles; assign/reassign and addNote have their own panels. */
type BarAction = Exclude<IncidentAction, 'assign' | 'reassign' | 'addNote'>

const BAR_ACTIONS: BarAction[] = ['acknowledge', 'start', 'resolve', 'verify', 'reopen', 'close', 'classify']

type ActionMeta = {
  label: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: (incident: IncidentResponse) => string
  confirmLabel: string
  text?: ConfirmTextInput
  secondary?: boolean
}

const META: Record<BarAction, ActionMeta> = {
  acknowledge: {
    label: 'Acknowledge',
    icon: Hand,
    title: 'Acknowledge this incident?',
    description: (i) => `You confirm you've seen ${i.id} and will handle it. This stops the response SLA clock.`,
    confirmLabel: 'Acknowledge',
  },
  start: {
    label: 'Start work',
    icon: Play,
    title: 'Start work?',
    description: (i) => `${i.id} moves to In progress.`,
    confirmLabel: 'Start work',
  },
  resolve: {
    label: 'Resolve',
    icon: CircleCheckBig,
    title: 'Resolve this incident?',
    description: (i) => `This stops the resolution SLA clock. ${i.reporterName} will be asked to verify the fix.`,
    confirmLabel: 'Resolve',
    text: { label: 'Resolution details', placeholder: 'What was wrong and what fixed it.', maxLength: 2000 },
  },
  verify: {
    label: 'Confirm it works',
    icon: CheckCheck,
    title: 'Is the problem fixed?',
    description: () => 'Confirm the fix works for you. Afterwards the incident can be closed.',
    confirmLabel: 'Yes, it works',
  },
  reopen: {
    label: 'Not fixed, reopen',
    icon: RotateCcw,
    title: 'Reopen this incident?',
    description: (i) => `${i.id} goes back to the technician as In progress. Tell them what still doesn't work.`,
    confirmLabel: 'Reopen',
    text: { label: 'Reason', placeholder: 'What still happens?', maxLength: 2000 },
    secondary: true,
  },
  close: {
    label: 'Close',
    icon: Lock,
    title: 'Close this incident?',
    description: (i) => `${i.id} will be closed. Closed incidents cannot be changed.`,
    confirmLabel: 'Close incident',
  },
  classify: {
    label: 'Classify',
    icon: Tags,
    title: 'Set the priority',
    description: () => 'The priority decides the SLA deadlines. After this the incident can be assigned.',
    confirmLabel: 'Classify',
  },
}

type ActionBarProps = {
  incident: IncidentResponse
  actions: IncidentAction[]
  pending: boolean
  run: (command: ActionCommand, options: { onSuccess: () => void }) => void
}

export function ActionBar({ incident, actions, pending, run }: ActionBarProps) {
  const [open, setOpen] = useState<BarAction | null>(null)
  const [priority, setPriority] = useState<Priority | ''>('')
  const shown = BAR_ACTIONS.filter((action) => actions.includes(action))
  if (shown.length === 0) return null

  // The first non-secondary action is the filled (main) button; the rest are outlined.
  const primary = shown.find((action) => META[action].secondary !== true)

  function confirm(action: BarAction, text: string) {
    const close = { onSuccess: () => setOpen(null) }
    if (action === 'resolve') run({ action, resolutionDetails: text }, close)
    else if (action === 'reopen') run({ action, reason: text }, close)
    else if (action === 'classify') {
      if (priority !== '') run({ action, priority }, close)
    } else run({ action }, close)
  }

  const meta = open === null ? null : META[open]

  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((action) => {
        const Icon = META[action].icon
        return (
          <Button key={action} variant={action === primary ? 'default' : 'outline'} onClick={() => setOpen(action)}>
            <Icon />
            {META[action].label}
          </Button>
        )
      })}

      {open !== null && meta !== null && (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) setOpen(null)
          }}
          title={meta.title}
          description={meta.description(incident)}
          confirmLabel={meta.confirmLabel}
          textInput={meta.text}
          pending={pending}
          canConfirm={open !== 'classify' || priority !== ''}
          onConfirm={(text) => confirm(open, text)}
        >
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
