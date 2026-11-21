import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { LoaderCircle, Send, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, errorMessage } from '@/api/errors'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import { IMPACTS, URGENCIES } from '@/api/types'
import { useCategories, useServices } from '@/api/useReferenceData'
import { FormField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DuplicatePanel } from '@/features/report/DuplicatePanel'
import {
  DESCRIPTION_MAX,
  EMPTY_REPORT_FORM,
  reportSchema,
  toCreateRequest,
  type ReportFormInput,
  type ReportFormValues,
} from '@/features/report/reportSchema'
import { useDuplicateCheck } from '@/features/report/useDuplicateCheck'
import { LEVEL_LABEL, criticalityLabel } from '@/lib/labels'

// Backend field names that map 1:1 onto form fields (CreateIncidentRequest uses the same names).
const FORM_FIELDS = ['title', 'description', 'categoryName', 'serviceId', 'impact', 'urgency'] as const
type FormFieldName = (typeof FORM_FIELDS)[number]

function isFormField(name: string): name is FormFieldName {
  return (FORM_FIELDS as readonly string[]).includes(name)
}

const IMPACT_HINT: Record<(typeof IMPACTS)[number], string> = {
  LOW: 'Just me',
  MEDIUM: 'My team',
  HIGH: 'Many people or the whole site',
}

const URGENCY_HINT: Record<(typeof URGENCIES)[number], string> = {
  LOW: 'I can work around it',
  MEDIUM: 'It slows my work down',
  HIGH: "I can't work",
}

export function ReportIncidentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const services = useServices()
  const categories = useCategories()

  // react-hook-form keeps the field values itself (not in React state), so typing doesn't
  // re-render the whole page. zodResolver runs reportSchema when the form is submitted.
  const form = useForm<ReportFormInput, unknown, ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: EMPTY_REPORT_FORM,
  })
  const { register, control, handleSubmit, setError, formState } = form
  const { errors } = formState

  // useWatch re-renders only for these four values, which feed the duplicate check.
  const [title, description, categoryName, serviceId] = useWatch({
    control,
    name: ['title', 'description', 'categoryName', 'serviceId'],
  })
  const duplicates = useDuplicateCheck({
    title: title ?? '',
    description: description ?? '',
    categoryName: categoryName ?? '',
    serviceId: serviceId ?? '',
  })

  const report = useMutation({
    mutationFn: (values: ReportFormValues) => incidentsApi.report(toCreateRequest(values)),
    onSuccess: (incident) => {
      // The lists that show this employee's incidents are now out of date.
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidentLists() })
      queryClient.setQueryData(queryKeys.incident(incident.id), incident)
      toast.success(`${incident.id} reported`, {
        description:
          incident.assignedTechnicianName !== null
            ? `Priority ${incident.priority ?? '—'} · assigned to ${incident.assignedTechnicianName}`
            : `Priority ${incident.priority ?? '—'} · waiting for a technician`,
      })
      navigate(`/incidents/${encodeURIComponent(incident.id)}`)
    },
    onError: (error) => {
      // Put each backend validation message under its field; anything else goes to the top.
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (isFormField(field)) setError(field, { type: 'server', message })
          else setError('root.server', { type: 'server', message: error.message })
        }
        return
      }
      setError('root.server', { type: 'server', message: errorMessage(error) })
    },
  })

  const serverError = errors.root?.server?.message

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Employee"
        title="Report an incident"
        description="Tell IT what is broken. We'll set a priority and SLA, and assign a technician."
      />

      <form
        noValidate
        onSubmit={handleSubmit((values) => report.mutate(values))}
        className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="space-y-5">
          {serverError !== undefined && (
            <p role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              {serverError}
            </p>
          )}

          <FormField label="Title" error={errors.title?.message} hint="One line, e.g. “VPN disconnects every few minutes”.">
            {(controlProps) => <Input autoComplete="off" className="h-10" {...controlProps} {...register('title')} />}
          </FormField>

          <FormField
            label="Description"
            error={errors.description?.message}
            hint={`Optional. What happened, since when, what you already tried. Up to ${DESCRIPTION_MAX} characters.`}
          >
            {(controlProps) => <Textarea rows={5} {...controlProps} {...register('description')} />}
          </FormField>

          <div className="grid gap-5 md:grid-cols-2">
            <Controller
              control={control}
              name="categoryName"
              render={({ field }) => (
                <FormField label="Category" error={errors.categoryName?.message}>
                  {(controlProps) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={categories.isPending}>
                      <SelectTrigger className="h-10 w-full" onBlur={field.onBlur} {...controlProps}>
                        <SelectValue placeholder={categories.isPending ? 'Loading…' : 'Choose a category'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories.data ?? []).map((category) => (
                          <SelectItem key={category.name} value={category.name}>
                            {titleCase(category.name)}
                            <span className="text-muted-foreground"> · {category.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="serviceId"
              render={({ field }) => (
                <FormField
                  label="Affected service"
                  error={errors.serviceId?.message ?? (services.isError ? errorMessage(services.error) : undefined)}
                >
                  {(controlProps) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={!services.isSuccess}>
                      <SelectTrigger className="h-10 w-full" onBlur={field.onBlur} {...controlProps}>
                        <SelectValue placeholder={services.isPending ? 'Loading services…' : 'Choose a service'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(services.data ?? []).map((service) => (
                          <SelectItem key={service.id} value={String(service.id)}>
                            {service.name}
                            <span className="text-muted-foreground"> · {criticalityLabel(service.businessCriticality)}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="impact"
              render={({ field }) => (
                <FormField label="Impact: who is affected?" error={errors.impact?.message}>
                  {(controlProps) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 w-full" onBlur={field.onBlur} {...controlProps}>
                        <SelectValue placeholder="Choose impact" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPACTS.map((level) => (
                          <SelectItem key={level} value={level}>
                            {LEVEL_LABEL[level]}
                            <span className="text-muted-foreground"> · {IMPACT_HINT[level]}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            />

            <Controller
              control={control}
              name="urgency"
              render={({ field }) => (
                <FormField label="Urgency: how much does it block work?" error={errors.urgency?.message}>
                  {(controlProps) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="h-10 w-full" onBlur={field.onBlur} {...controlProps}>
                        <SelectValue placeholder="Choose urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCIES.map((level) => (
                          <SelectItem key={level} value={level}>
                            {LEVEL_LABEL[level]}
                            <span className="text-muted-foreground"> · {URGENCY_HINT[level]}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormField>
              )}
            />
          </div>

          <div className="flex items-center gap-3 border-t pt-5">
            <Button type="submit" className="h-10" disabled={report.isPending}>
              {report.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
              {report.isPending ? 'Reporting…' : 'Report incident'}
            </Button>
            <p className="text-xs text-muted-foreground">Priority and SLA are set automatically from impact, urgency and the service.</p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          {/* A failed check is hidden on purpose: it is only a hint and must never block reporting. */}
          <DuplicatePanel
            candidates={duplicates.isError ? [] : (duplicates.data ?? [])}
            checking={duplicates.isFetching}
          />
        </aside>
      </form>
    </div>
  )
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}
