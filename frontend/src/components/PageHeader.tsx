import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  /** Small text above the title, e.g. the section ("Administration"). */
  eyebrow?: string
  /** Buttons on the right (e.g. "Report incident"). */
  actions?: ReactNode
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        {eyebrow !== undefined && (
          <p className="mb-1 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">{eyebrow}</p>
        )}
        <h1 className="text-[1.6rem] leading-tight font-semibold tracking-tight">{title}</h1>
        {description !== undefined && <p className="mt-1.5 max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions !== undefined && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
