import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { StrategyResponse } from '@/api/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// What each backend strategy (the Strategy pattern in com.itsm.domain.strategy) does, in plain words.
// A strategy the backend offers but this list doesn't know is still shown, with its raw name.
const STRATEGY_INFO: Record<string, { title: string; summary: string }> = {
  SKILL_BASED: {
    title: 'Skill based',
    summary:
      'Only technicians with a skill in the incident’s category and room for more work; among them, ' +
      'the one with the fewest active incidents. If nobody has the skill, nobody is picked.',
  },
  LOAD_BASED: {
    title: 'Load based',
    summary:
      'Any technician with room for more work, whatever their skills; the one with the fewest ' +
      'active incidents wins. Spreads work evenly when everyone can handle most incidents.',
  },
}

function infoFor(name: string) {
  return STRATEGY_INFO[name] ?? { title: name, summary: 'No description for this strategy yet.' }
}

/** Which rule picks the technician when an incident is auto-assigned. */
export function AssignmentStrategyPage() {
  const strategy = useQuery({ queryKey: queryKeys.strategy(), queryFn: adminApi.getStrategy })
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Assignment strategy"
        description="The rule that chooses a technician when an incident is assigned automatically."
      />
      <QueryState query={strategy} errorTitle="Could not load the assignment strategy">
        {(data) => <StrategyChooser data={data} />}
      </QueryState>
    </div>
  )
}

function StrategyChooser({ data }: { data: StrategyResponse }) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<string | null>(null) // the strategy waiting for confirmation

  const change = useMutation({
    mutationFn: (name: string) => adminApi.changeStrategy(name),
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.strategy(), response)
      toast.success(`Now assigning with: ${infoFor(response.current).title}`)
      setPending(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  // A Set from Java arrives as an array in no fixed order; sort so the cards never swap places.
  const names = [...data.available].sort()

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {names.map((name) => {
          const info = infoFor(name)
          const current = name === data.current
          return (
            <section
              key={name}
              aria-current={current ? 'true' : undefined}
              className={cn('flex flex-col rounded-lg border bg-card p-5', current && 'border-primary ring-1 ring-primary')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{info.title}</h2>
                  <p className="font-mono text-xs text-muted-foreground">{name}</p>
                </div>
                {current && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    <CheckCircle2 className="size-4" />
                    In use
                  </span>
                )}
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{info.summary}</p>
              {!current && (
                <Button variant="outline" className="mt-4 self-start" onClick={() => setPending(name)}>
                  Switch to {info.title.toLowerCase()}
                </Button>
              )}
            </section>
          )
        })}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title={`Switch to ${pending === null ? '' : infoFor(pending).title.toLowerCase()} assignment?`}
        description="It applies to the next automatic assignment. Incidents that already have a technician keep them."
        confirmLabel="Switch"
        pending={change.isPending}
        onConfirm={() => {
          if (pending !== null) change.mutate(pending)
        }}
      />
    </>
  )
}
