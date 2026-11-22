import type { ComponentType } from 'react'
import { CheckCheck, CircleCheckBig, Hand, Lock, MessageCircleQuestion, Play, RotateCcw, Tags } from 'lucide-react'
import type { IncidentResponse } from '@/api/types'
import type { ConfirmTextInput } from '@/components/ConfirmDialog'
import type { IncidentAction } from './actions'

// Texts and icons for each status-changing action. Used by the ActionBar on the detail page and
// by the quick actions in the technician queue, so both ask the same question.

/** The actions this bar handles; assign/reassign, addNote and comment have their own panels. */
export type BarAction = Exclude<IncidentAction, 'assign' | 'reassign' | 'addNote' | 'comment'>

export const BAR_ACTIONS: BarAction[] = ['acknowledge', 'start', 'resolve', 'requestInfo', 'verify', 'reopen', 'close', 'classify']

export type ActionMeta = {
  label: string
  icon: ComponentType<{ className?: string }>
  title: string
  description: (incident: IncidentResponse) => string
  confirmLabel: string
  text?: ConfirmTextInput
  secondary?: boolean
}

/** Button label, icon and confirmation text per action; the queue's quick actions reuse these. */
export const ACTION_META: Record<BarAction, ActionMeta> = {
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
  requestInfo: {
    label: 'Ask reporter',
    icon: MessageCircleQuestion,
    title: 'Ask the reporter for information',
    description: (i) =>
      `${i.reporterName} is notified and sees your question at the top of ${i.id}. Their reply appears in the notes.`,
    confirmLabel: 'Send question',
    text: { label: 'Question', placeholder: 'e.g. Which room is the printer in?', maxLength: 2000 },
    secondary: true,
  },
  verify: {
    label: 'Confirm it works',
    icon: CheckCheck,
    title: 'Is the problem fixed?',
    description: () => 'Confirm the fix works for you. Afterwards the incident can be closed. Feedback is optional.',
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
