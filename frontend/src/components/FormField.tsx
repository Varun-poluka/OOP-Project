import { useId, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Props that tie a control to its label and message. Spread them onto the focusable element. */
export type ControlProps = {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

type FormFieldProps = {
  label: string
  /** Validation message; shown in red under the control and announced by screen readers. */
  error?: string
  hint?: string
  className?: string
  /**
   * Renders the control. It receives ControlProps to put on the element that gets focus:
   * the <input> itself, or for a Radix Select its trigger button (not the Select root,
   * which renders no element of its own).
   */
  children: (controlProps: ControlProps) => ReactNode
}

/** Label + control + hint/error, wired together with ids so assistive tech reads them as one. */
export function FormField({ label, error, hint, className, children }: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const hasMessage = error !== undefined || hint !== undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error !== undefined ? true : undefined,
        'aria-describedby': hasMessage ? messageId : undefined,
      })}
      {error !== undefined ? (
        <p id={messageId} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={messageId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
