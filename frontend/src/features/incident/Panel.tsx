import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A titled box used for each section of the incident page. */
export function Panel({ title, aside, children, className, id }: { title: string; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} aria-labelledby={id === undefined ? undefined : `${id}-title`} className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 id={id === undefined ? undefined : `${id}-title`} className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {title}
        </h2>
        {aside}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}
