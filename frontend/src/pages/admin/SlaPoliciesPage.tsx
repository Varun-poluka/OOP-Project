import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, LoaderCircle, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { Priority, SlaCheckResponse, SlaPolicyResponse } from '@/api/types'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeMinutes, validatePolicyDraft, type PolicyDraft, type PolicyErrors } from '@/features/sla/policyValidation'
import { toDateTimeLocalText } from '@/lib/dates'
import { formatDateTime } from '@/lib/time'
import { useNow } from '@/lib/useNow'

/** Response and resolution targets per priority, plus a manual SLA check. */
export function SlaPoliciesPage() {
  const policies = useQuery({ queryKey: queryKeys.slaPolicies(), queryFn: adminApi.slaPolicies })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="SLA policies"
        description="How long each priority may wait for a response and for a fix."
      />

      <section className="space-y-3">
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          A change applies to incidents reported <strong className="font-medium text-foreground">after</strong> it.
          Incidents already open keep the deadlines they were given.
        </p>
        <QueryState query={policies} errorTitle="Could not load the SLA policies">
          {(rows) => <PolicyTable policies={rows} />}
        </QueryState>
      </section>

      <SlaCheckPanel />
    </div>
  )
}

function PolicyTable({ policies }: { policies: SlaPolicyResponse[] }) {
  // Only one row is edited at a time; null means none.
  const [editing, setEditing] = useState<Priority | null>(null)
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[40rem] text-left">
        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Priority</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Respond within</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Resolve within</th>
            <th scope="col" className="w-48 px-4 py-2.5 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {policies.map((policy) =>
            editing === policy.priority ? (
              <EditRow key={policy.priority} policy={policy} onDone={() => setEditing(null)} />
            ) : (
              <tr key={policy.priority}>
                <td className="px-4 py-3">
                  <PriorityBadge priority={policy.priority} showLabel />
                </td>
                <MinutesCell minutes={policy.responseMinutes} />
                <MinutesCell minutes={policy.resolutionMinutes} />
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(policy.priority)}
                    disabled={editing !== null}
                    aria-label={`Edit ${policy.priority} policy`}
                  >
                    <Pencil />
                    Edit
                  </Button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function MinutesCell({ minutes }: { minutes: number }) {
  return (
    <td className="px-4 py-3">
      <span className="font-mono tabular">{minutes} min</span>
      <span className="ml-2 text-xs text-muted-foreground">({describeMinutes(minutes)})</span>
    </td>
  )
}

function EditRow({ policy, onDone }: { policy: SlaPolicyResponse; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<PolicyDraft>({
    responseMinutes: String(policy.responseMinutes),
    resolutionMinutes: String(policy.resolutionMinutes),
  })
  // Errors appear after the first Save attempt, then update as the admin types.
  const [errors, setErrors] = useState<PolicyErrors | null>(null)

  const save = useMutation({
    mutationFn: (value: { responseMinutes: number; resolutionMinutes: number }) =>
      adminApi.updateSlaPolicy(policy.priority, value),
    onSuccess: (updated) => {
      // Put the server's answer straight into the cached list, so the table shows it without a refetch.
      queryClient.setQueryData<SlaPolicyResponse[]>(queryKeys.slaPolicies(), (old) =>
        old?.map((row) => (row.priority === updated.priority ? updated : row)),
      )
      toast.success(`${updated.priority} policy saved. It applies to new incidents`)
      onDone()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  function change(field: keyof PolicyDraft, value: string) {
    const next = { ...draft, [field]: value }
    setDraft(next)
    if (errors !== null) {
      const result = validatePolicyDraft(next)
      setErrors(result.ok ? {} : result.errors)
    }
  }

  function submit() {
    const result = validatePolicyDraft(draft)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    save.mutate(result.value)
  }

  return (
    <tr className="bg-accent/40 align-top">
      <td className="px-4 py-3">
        <PriorityBadge priority={policy.priority} showLabel />
      </td>
      <MinutesInput
        label={`${policy.priority} response minutes`}
        value={draft.responseMinutes}
        error={errors?.responseMinutes}
        onChange={(value) => change('responseMinutes', value)}
        onEnter={submit}
      />
      <MinutesInput
        label={`${policy.priority} resolution minutes`}
        value={draft.resolutionMinutes}
        error={errors?.resolutionMinutes}
        onChange={(value) => change('resolutionMinutes', value)}
        onEnter={submit}
      />
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Button size="sm" variant="ghost" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={save.isPending} className="ml-1">
          {save.isPending && <LoaderCircle className="animate-spin" />}
          Save
        </Button>
      </td>
    </tr>
  )
}

function MinutesInput({
  label,
  value,
  error,
  onChange,
  onEnter,
}: {
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
  onEnter: () => void
}) {
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        {/* inputMode="numeric" shows a number pad on phones but keeps the value as text we validate. */}
        <Input
          aria-label={label}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onEnter()
          }}
          aria-invalid={error !== undefined ? true : undefined}
          className="h-8 w-28 font-mono"
        />
        <span className="text-xs text-muted-foreground">min</span>
      </div>
      {error !== undefined && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </td>
  )
}

/** Runs the scheduler's SLA check on demand, now or "as if" at a later time (handy for the demo). */
function SlaCheckPanel() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<'now' | 'at'>('now')
  // datetime-local gives "2026-11-21T14:30"; the backend wants seconds too.
  const [at, setAt] = useState('')
  const [result, setResult] = useState<SlaCheckResponse | null>(null)

  const check = useMutation({
    mutationFn: () => adminApi.runSlaCheck(mode === 'at' ? `${at}:00` : undefined),
    onSuccess: (response) => {
      setResult(response)
      // The check may have flagged breaches and risks, so every incident view is out of date.
      void queryClient.invalidateQueries({ queryKey: ['incidents'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports() })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  // The current local time as datetime-local text ("2026-11-21T14:30"), for the input's min.
  const nowLocal = toDateTimeLocalText(useNow())
  const atMissing = mode === 'at' && at === ''
  const atInPast = mode === 'at' && at !== '' && at < nowLocal

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-medium">
        <Clock className="size-4 text-muted-foreground" />
        Run SLA check
      </h2>
      <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">
        The scheduler checks every open incident regularly. Run it now, or pick a future time to see which incidents
        would be breached or at risk by then. A check at a future time records those breaches for real.
      </p>

      <fieldset className="mt-4 flex flex-wrap items-end gap-4">
        <legend className="sr-only">When to check</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="sla-check-mode" checked={mode === 'now'} onChange={() => setMode('now')} />
          Now
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="sla-check-mode" checked={mode === 'at'} onChange={() => setMode('at')} />
          At a chosen time
        </label>
        {mode === 'at' && (
          <div className="space-y-1">
            <Label htmlFor="sla-check-at" className="text-xs text-muted-foreground">
              Check as if it were
            </Label>
            <Input
              id="sla-check-at"
              type="datetime-local"
              value={at}
              min={nowLocal}
              onChange={(event) => setAt(event.target.value)}
              className="h-9 w-56"
            />
          </div>
        )}
        <Button onClick={() => check.mutate()} disabled={check.isPending || atMissing || atInPast}>
          {check.isPending && <LoaderCircle className="animate-spin" />}
          Run check
        </Button>
      </fieldset>
      {atInPast && <p className="mt-2 text-sm text-destructive">Pick a time in the future.</p>}

      {result !== null && (
        <dl aria-live="polite" className="mt-4 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-md border bg-border">
          <div className="bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">Checked as of</dt>
            <dd className="mt-0.5 text-sm">{formatDateTime(result.checkedAt)}</dd>
          </div>
          <div className="bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">New breaches</dt>
            <dd className="mt-0.5 font-mono text-lg tabular">{result.breachesRecorded}</dd>
          </div>
          <div className="bg-card px-3 py-2">
            <dt className="text-xs text-muted-foreground">Newly at risk</dt>
            <dd className="mt-0.5 font-mono text-lg tabular">{result.risksRecorded}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
