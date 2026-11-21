import { useId, useState, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type ConfirmTextInput = {
  label: string
  placeholder?: string
  /** Max characters (the backend's @Size limit). */
  maxLength: number
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  /** When set, the dialog asks for required text (e.g. a reopen reason) and passes it to onConfirm. */
  textInput?: ConfirmTextInput
  /** Extra controls (e.g. a priority picker); the parent keeps their state. */
  children?: ReactNode
  /** Set false to disable the confirm button until the extra controls are filled in. */
  canConfirm?: boolean
  destructive?: boolean
  pending: boolean
  onConfirm: (text: string) => void
}

/**
 * "Are you sure?" for actions that change an incident's status.
 * It stays open while the request runs; the caller closes it on success,
 * so on an error the user keeps what they typed and can try again.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  textInput,
  children,
  canConfirm = true,
  destructive = false,
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  const [text, setText] = useState('')
  const [touched, setTouched] = useState(false)
  const inputId = useId()
  const textMissing = textInput !== undefined && text.trim().length === 0

  function handleOpenChange(next: boolean) {
    if (pending) return // don't close mid-request
    if (!next) {
      setText('')
      setTouched(false)
    }
    onOpenChange(next)
  }

  function confirm() {
    setTouched(true)
    if (textMissing || !canConfirm) return
    onConfirm(text.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {children}

        {textInput !== undefined && (
          <div className="space-y-1.5">
            <Label htmlFor={inputId}>{textInput.label}</Label>
            <Textarea
              id={inputId}
              rows={4}
              value={text}
              maxLength={textInput.maxLength}
              placeholder={textInput.placeholder}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={touched && textMissing ? true : undefined}
            />
            {touched && textMissing && <p className="text-sm text-destructive">This is required.</p>}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {/* A plain Button, not AlertDialogAction: that one closes the dialog immediately. */}
          <Button
            variant={destructive ? 'destructive' : 'default'}
            onClick={confirm}
            disabled={pending || !canConfirm}
          >
            {pending && <LoaderCircle className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
