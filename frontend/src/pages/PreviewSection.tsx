import type { ReactNode } from 'react'

/** A clearly labelled box for sample content, so nobody mistakes it for real data. */
export function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={`${title} (preview with sample data)`} className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{title}</h2>
        <span className="rounded-sm border px-1.5 py-px font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
          Preview · sample data
        </span>
      </div>
      {children}
    </section>
  )
}
