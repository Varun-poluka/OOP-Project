import type { ReactNode } from 'react'
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

/** A dialog with a form inside, built from the AlertDialog parts so it looks like the other dialogs. */
export function FormDialog({
  title,
  description,
  children,
  error,
  submitLabel,
  pending,
  canSubmit,
  onSubmit,
  onClose,
}: {
  title: string
  description: string
  children: ReactNode
  /** The backend's message for a rejected request (e.g. a 400), shown inside the dialog. */
  error: string | null
  submitLabel: string
  pending: boolean
  canSubmit: boolean
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <AlertDialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault() // stay on the page; we send the request ourselves
            if (canSubmit && !pending) onSubmit()
          }}
          className="space-y-4"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {children}
          {error !== null && (
            <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={pending}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={pending || !canSubmit}>
              {pending && <LoaderCircle className="animate-spin" />}
              {submitLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
