import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Network, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import { servicesApi } from '@/api/services'
import type { ServiceRef, ServiceResponse } from '@/api/types'
import { useServices } from '@/api/useReferenceData'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { FormDialog } from '@/components/FormDialog'
import { FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImpactGraph } from '@/features/services/ImpactGraph'
import { layoutImpact } from '@/features/services/impactLayout'
import { criticalityLabel } from '@/lib/labels'

/** The IT service catalogue: what depends on what, and what an outage would hit. */
export function ServicesPage() {
  const services = useServices()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Services"
        description="The IT services incidents are reported against, and how they depend on each other."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus />
            New service
          </Button>
        }
      />

      <QueryState
        query={services}
        isEmpty={(data) => data.length === 0}
        empty={<EmptyState icon={Network} title="No services yet" description="Create the first one." />}
      >
        {(data) => {
          const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name))
          return (
            <>
              <ServiceTable services={sorted} />
              <ImpactExplorer services={sorted} />
            </>
          )
        }}
      </QueryState>

      {/* Only mounted while open, so every opening starts with an empty form. */}
      {creating && <CreateServiceDialog services={services.data ?? []} onClose={() => setCreating(false)} />}
    </div>
  )
}

/** After any catalogue change, refetch the list and every impact result (both start with ['services']). */
function useRefreshServices() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.services() })
}

function ServiceTable({ services }: { services: ServiceResponse[] }) {
  const [adding, setAdding] = useState<ServiceResponse | null>(null)
  const [removing, setRemoving] = useState<{ service: ServiceResponse; dependency: ServiceRef } | null>(null)
  const refresh = useRefreshServices()

  const remove = useMutation({
    mutationFn: (target: { service: ServiceResponse; dependency: ServiceRef }) =>
      servicesApi.removeDependency(target.service.id, target.dependency.id),
    onSuccess: async (_updated, target) => {
      await refresh()
      toast.success(`${target.service.name} no longer depends on ${target.dependency.name}`)
      setRemoving(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[48rem] text-left">
          <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">Service</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Criticality</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Depends on</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Open incidents</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {services.map((service) => (
              <tr key={service.id} className="align-top">
                <td className="px-4 py-3 font-medium">{service.name}</td>
                <td className="px-4 py-3">
                  <CriticalityPill level={service.businessCriticality} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {service.dependsOn.length === 0 && <span className="text-xs text-muted-foreground">Nothing</span>}
                    {[...service.dependsOn]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((dependency) => (
                        <span
                          key={dependency.id}
                          className="inline-flex h-6 items-center gap-1 rounded-sm border bg-muted/50 pr-0.5 pl-2 text-xs"
                        >
                          {dependency.name}
                          <button
                            type="button"
                            onClick={() => setRemoving({ service, dependency })}
                            aria-label={`Remove: ${service.name} depends on ${dependency.name}`}
                            className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setAdding(service)}>
                      <Plus className="size-3" />
                      Add
                    </Button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular">{service.openIncidentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding !== null && <AddDependencyDialog service={adding} services={services} onClose={() => setAdding(null)} />}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title="Remove this dependency?"
        description={
          removing === null
            ? ''
            : `${removing.service.name} will no longer count as impacted when ${removing.dependency.name} has an outage.`
        }
        confirmLabel="Remove"
        destructive
        pending={remove.isPending}
        onConfirm={() => {
          if (removing !== null) remove.mutate(removing)
        }}
      />
    </>
  )
}

function CriticalityPill({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      {/* Three pips, filled up to the level: the shape carries the value, not just a colour. */}
      <span aria-hidden className="inline-flex gap-0.5">
        {[1, 2, 3].map((pip) => (
          <span key={pip} className={pip <= level ? 'size-2 rounded-full bg-foreground/70' : 'size-2 rounded-full bg-border'} />
        ))}
      </span>
      {criticalityLabel(level)}
    </span>
  )
}

function CreateServiceDialog({ services, onClose }: { services: ServiceResponse[]; onClose: () => void }) {
  const refresh = useRefreshServices()
  const [name, setName] = useState('')
  const [criticality, setCriticality] = useState('2')
  const [dependsOn, setDependsOn] = useState<number[]>([])

  const create = useMutation({
    mutationFn: () =>
      servicesApi.create({ name: name.trim(), businessCriticality: Number(criticality), dependsOnIds: dependsOn }),
    onSuccess: async (created) => {
      await refresh()
      toast.success(`Service ${created.name} created`)
      onClose()
    },
  })

  function toggle(id: number) {
    setDependsOn((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }

  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <FormDialog
      title="New service"
      description="Add a service people can report incidents against."
      error={create.isError ? errorMessage(create.error) : null}
      submitLabel="Create"
      pending={create.isPending}
      canSubmit={name.trim().length > 0}
      onSubmit={() => create.mutate()}
      onClose={onClose}
    >
      <div className="space-y-1.5">
        <Label htmlFor="service-name">Name</Label>
        <Input id="service-name" value={name} maxLength={100} onChange={(event) => setName(event.target.value)} autoFocus />
      </div>
      <FilterSelect
        label="Business criticality"
        value={criticality}
        onChange={setCriticality}
        options={[1, 2, 3].map((level) => ({ value: String(level), label: `${level} · ${criticalityLabel(level)}` }))}
      />
      {sorted.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="text-xs text-muted-foreground">Depends on (optional)</legend>
          <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2">
            {sorted.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dependsOn.includes(service.id)} onChange={() => toggle(service.id)} />
                {service.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </FormDialog>
  )
}

function AddDependencyDialog({
  service,
  services,
  onClose,
}: {
  service: ServiceResponse
  services: ServiceResponse[]
  onClose: () => void
}) {
  const refresh = useRefreshServices()
  const [target, setTarget] = useState('')

  const add = useMutation({
    mutationFn: (dependsOnId: number) => servicesApi.addDependency(service.id, dependsOnId),
    onSuccess: async (updated) => {
      await refresh()
      toast.success(`${updated.name} now depends on ${services.find((s) => String(s.id) === target)?.name ?? 'it'}`)
      onClose()
    },
  })

  // Every service is offered, even this one and existing dependencies: the backend's rules decide,
  // and its message ("Service cannot depend on itself", "... already depends on ...") is shown here.
  return (
    <FormDialog
      title={`${service.name} depends on…`}
      description={`If the service you pick has an outage, ${service.name} will be impacted too.`}
      error={add.isError ? errorMessage(add.error) : null}
      submitLabel="Add dependency"
      pending={add.isPending}
      canSubmit={target !== ''}
      onSubmit={() => add.mutate(Number(target))}
      onClose={onClose}
    >
      <FilterSelect
        label="Service"
        className="w-full"
        value={target}
        placeholder="Choose a service"
        onChange={(value) => {
          setTarget(value)
          add.reset() // a new choice clears the previous error
        }}
        options={services.map((option) => ({
          value: String(option.id),
          label:
            option.id === service.id
              ? `${option.name} (this service)`
              : service.dependsOn.some((dep) => dep.id === option.id)
                ? `${option.name} (already a dependency)`
                : option.name,
        }))}
      />
    </FormDialog>
  )
}

function ImpactExplorer({ services }: { services: ServiceResponse[] }) {
  const [selected, setSelected] = useState<number | null>(null)
  const impact = useQuery({
    queryKey: queryKeys.serviceImpact(selected ?? -1),
    queryFn: () => servicesApi.impact(selected as number),
    enabled: selected !== null, // nothing to fetch until a service is picked
  })

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-medium">Impact explorer</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            If this service went down, which other services would be affected, and how many hops away?
          </p>
        </div>
        <FilterSelect
          label="Service with an outage"
          className="w-56"
          value={selected === null ? '' : String(selected)}
          placeholder="Choose a service"
          onChange={(value) => setSelected(Number(value))}
          options={services.map((service) => ({ value: String(service.id), label: service.name }))}
        />
      </div>

      {selected === null ? (
        <p className="text-sm text-muted-foreground">Pick a service to see its impact.</p>
      ) : (
        <QueryState query={impact} errorTitle="Could not work out the impact">
          {(data) =>
            data.impactedCount === 0 ? (
              <p className="text-sm text-muted-foreground">No other service depends on {data.serviceName}.</p>
            ) : (
              <div className="space-y-4">
                <ImpactGraph layout={layoutImpact(data, services)} />
                <table className="w-full max-w-xl text-left text-sm">
                  <caption className="mb-1 text-left text-xs text-muted-foreground">
                    {data.impactedCount} services impacted by an outage of {data.serviceName}
                  </caption>
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-1 font-medium">Service</th>
                      <th scope="col" className="py-1 font-medium">Criticality</th>
                      <th scope="col" className="py-1 text-right font-medium">Hops away</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...data.impacted]
                      .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
                      .map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5">{item.name}</td>
                          <td className="py-1.5">
                            <CriticalityPill level={item.businessCriticality} />
                          </td>
                          <td className="py-1.5 text-right font-mono tabular">{item.distance}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </QueryState>
      )}
    </section>
  )
}
