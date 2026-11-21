import type { ComponentType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  /** Any lucide icon component, e.g. Inbox or ListChecks. */
  icon?: ComponentType<{ className?: string }>
  action?: ReactNode
  className?: string
}

/** Shown when a list or page has nothing to display yet. */
export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 grid size-10 place-items-center rounded-md border bg-card text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="font-medium">{title}</p>
      {description !== undefined && <p className="mt-1 max-w-sm text-muted-foreground">{description}</p>}
      {action !== undefined && <div className="mt-5">{action}</div>}
    </div>
  )
}
