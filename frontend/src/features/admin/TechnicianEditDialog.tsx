import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { CategoryResponse, TechnicianResponse } from '@/api/types'
import { FormDialog } from '@/components/FormDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formStateOf, maxWorkloadError, toUpdateRequest, toggleSkill } from './technicianForm'

type Props = {
  tech: TechnicianResponse
  categories: CategoryResponse[]
  onClose: () => void
}

/** Edit skills, on-leave and max workload. Mounted only while open, so it starts from the saved values. */
export function TechnicianEditDialog({ tech, categories, onClose }: Props) {
  const queryClient = useQueryClient()
  const [state, setState] = useState(() => formStateOf(tech))
  const workloadError = maxWorkloadError(state.maxWorkload, tech.activeIncidents)

  const save = useMutation({
    mutationFn: () => adminApi.updateTechnician(tech.id, toUpdateRequest(state)),
    onSuccess: async (saved) => {
      // ['technicians'] covers the list here and the assign dialog's list.
      await queryClient.invalidateQueries({ queryKey: queryKeys.technicians() })
      toast.success(`${saved.name} updated`)
      onClose()
    },
  })

  return (
    <FormDialog
      title={`Edit ${tech.name}`}
      description="Skills decide which incidents skill-based assignment gives them. On leave or full means no new automatic assignments."
      error={save.isError ? errorMessage(save.error) : null}
      submitLabel="Save"
      pending={save.isPending}
      canSubmit={workloadError === null}
      onSubmit={() => save.mutate()}
      onClose={onClose}
    >
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">Skills</legend>
        <div className="grid grid-cols-2 gap-1 rounded-md border p-2">
          {categories.map((category) => (
            <label key={category.name} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.skills.includes(category.name)}
                onChange={() => setState((s) => ({ ...s, skills: toggleSkill(s.skills, category.name) }))}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.onLeave}
          onChange={(event) => setState((s) => ({ ...s, onLeave: event.target.checked }))}
        />
        On leave (not available for new incidents)
      </label>

      <div className="space-y-1.5">
        <Label htmlFor="max-workload">Max workload</Label>
        <Input
          id="max-workload"
          type="number"
          inputMode="numeric"
          min={Math.max(1, tech.activeIncidents)}
          max={50}
          className="w-28"
          value={state.maxWorkload}
          aria-invalid={workloadError !== null ? true : undefined}
          aria-describedby="max-workload-message"
          onChange={(event) => setState((s) => ({ ...s, maxWorkload: event.target.value }))}
        />
        <p id="max-workload-message" className={workloadError !== null ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
          {workloadError ?? `Currently working on ${tech.activeIncidents}.`}
        </p>
      </div>
    </FormDialog>
  )
}
