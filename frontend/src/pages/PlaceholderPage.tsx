import type { ComponentType, ReactNode } from 'react'
import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

type PlaceholderPageProps = {
  eyebrow: string
  title: string
  description: string
  /** What this page will contain once it is built. */
  comingSoon: string
  icon?: ComponentType<{ className?: string }>
  actions?: ReactNode
  children?: ReactNode
}

/** Shared layout for pages that are not built yet: header, then a "coming next" empty state. */
export function PlaceholderPage({
  eyebrow,
  title,
  description,
  comingSoon,
  icon = Construction,
  actions,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {children}
      <EmptyState icon={icon} title="Not built yet" description={comingSoon} />
    </div>
  )
}
