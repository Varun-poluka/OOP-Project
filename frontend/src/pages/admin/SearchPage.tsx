import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Download, LoaderCircle, Search, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { errorMessage } from '@/api/errors'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import { INCIDENT_STATUSES, PRIORITIES } from '@/api/types'
import { useCategories, useTechnicians } from '@/api/useReferenceData'
import { DebouncedInput } from '@/components/DebouncedInput'
import { EmptyState } from '@/components/EmptyState'
import { ALL, FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IncidentTable, Pager } from '@/features/incidents/IncidentTable'
import { SORT_OPTIONS, type SortKey } from '@/features/incidents/listParams'
import { INCIDENT_CSV_COLUMNS } from '@/features/search/incidentCsv'
import {
  SEARCH_PAGE_SIZE,
  dateRangeProblem,
  hasActiveSearchFilters,
  readSearchFilters,
  toSearchCriteria,
  writeSearchFilters,
  type BreachedFilter,
  type SearchFilters,
} from '@/features/search/searchParams'
import { downloadCsv, toCsv } from '@/lib/csv'
import { toDateText } from '@/lib/dates'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'

/** The most rows one export fetches (one request of this size). */
const EXPORT_LIMIT = 1000

/** "incidents-2026-11-21.csv": named by the day it was exported. */
function exportFilename(): string {
  return `incidents-${toDateText(Date.now())}.csv`
}

/** Admin search over every incident: nine filters, all kept in the URL. */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readSearchFilters(searchParams)
  const categories = useCategories()
  const technicians = useTechnicians()

  function update(changes: Partial<SearchFilters>) {
    // Read the latest URL (prev): a debounced text box calls this later, after other changes.
    // Any filter change goes back to page 1, unless the change is the page itself.
    setSearchParams((prev) => writeSearchFilters({ ...readSearchFilters(prev), page: 1, ...changes }))
  }

  const dateProblem = dateRangeProblem(filters)
  const { criteria, page } = toSearchCriteria(filters)
  const query = useQuery({
    queryKey: queryKeys.incidentSearch(criteria, page),
    queryFn: () => incidentsApi.search(criteria, page),
    placeholderData: keepPreviousData,
    enabled: dateProblem === null, // the backend would answer 400; the message below says why
  })

  const [exporting, setExporting] = useState(false)
  async function exportCsv() {
    setExporting(true)
    try {
      // Same criteria and sort, but every match in one page (up to EXPORT_LIMIT), not just the page on screen.
      const all = await incidentsApi.search(criteria, { page: 0, size: EXPORT_LIMIT, sort: page.sort })
      downloadCsv(exportFilename(), toCsv(INCIDENT_CSV_COLUMNS, all.content))
      if (all.totalElements > all.content.length) {
        toast.warning(`Exported the first ${all.content.length} of ${all.totalElements} incidents`)
      } else {
        toast.success(`Exported ${all.content.length} incidents`)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setExporting(false)
    }
  }

  const filtered = hasActiveSearchFilters(filters)
  const resultCount = query.data?.totalElements ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Search incidents"
        description="Every incident in the system, filtered by any combination of fields."
        actions={
          <Button variant="outline" onClick={() => void exportCsv()} disabled={exporting || resultCount === 0}>
            {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
            Export CSV
          </Button>
        }
      />

      <div role="search" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="relative min-w-[16rem] flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">Text</span>
            <Search aria-hidden className="absolute bottom-2.5 left-2.5 size-4 text-muted-foreground" />
            <DebouncedInput
              type="search"
              value={filters.text}
              onCommit={(text) => update({ text })}
              placeholder="Title and description"
              className="h-9 pl-8"
            />
          </label>
          <FilterSelect
            label="Status"
            value={filters.status ?? ALL}
            onChange={(value) => update({ status: value === ALL ? null : (value as SearchFilters['status']) })}
            options={INCIDENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
            allLabel="All statuses"
          />
          <FilterSelect
            label="Priority"
            value={filters.priority ?? ALL}
            onChange={(value) => update({ priority: value === ALL ? null : (value as SearchFilters['priority']) })}
            options={PRIORITIES.map((priority) => ({ value: priority, label: `${priority} · ${PRIORITY_LABEL[priority]}` }))}
            allLabel="All priorities"
          />
          <FilterSelect
            label="Category"
            value={filters.category === '' ? ALL : filters.category}
            onChange={(value) => update({ category: value === ALL ? '' : value })}
            options={(categories.data ?? []).map((category) => ({ value: category.name, label: category.name }))}
            allLabel="All categories"
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FilterSelect
            label="Technician"
            className="w-52"
            value={filters.technicianId === '' ? ALL : filters.technicianId}
            onChange={(value) => update({ technicianId: value === ALL ? '' : value })}
            options={(technicians.data ?? []).map((tech) => ({ value: tech.id, label: tech.name }))}
            allLabel="Any technician"
          />
          <label className="w-40">
            <span className="mb-1 block text-xs text-muted-foreground">Reporter ID</span>
            <DebouncedInput
              value={filters.reporterId}
              onCommit={(reporterId) => update({ reporterId })}
              placeholder="e.g. U-EMP-1"
              className="h-9 font-mono"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">Reported from</span>
            <Input
              type="date"
              value={filters.from}
              max={filters.to === '' ? undefined : filters.to}
              onChange={(event) => update({ from: event.target.value })}
              className="h-9 w-40"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted-foreground">Reported to</span>
            <Input
              type="date"
              value={filters.to}
              min={filters.from === '' ? undefined : filters.from}
              onChange={(event) => update({ to: event.target.value })}
              className="h-9 w-40"
            />
          </label>
          <FilterSelect
            label="SLA breached"
            className="w-32"
            value={filters.breached}
            onChange={(value) => update({ breached: value as BreachedFilter })}
            options={[
              { value: 'any', label: 'Any' },
              { value: 'yes', label: 'Breached' },
              { value: 'no', label: 'Not breached' },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={filters.sort}
            onChange={(value) => update({ sort: value as SortKey })}
            options={(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => ({ value: key, label: SORT_OPTIONS[key].label }))}
          />
          {filtered && (
            <Button variant="ghost" className="h-9" onClick={() => setSearchParams(new URLSearchParams())}>
              Clear filters
            </Button>
          )}
        </div>
        {dateProblem !== null && <p className="text-sm text-destructive">{dateProblem}</p>}
      </div>

      {dateProblem === null && (
        <QueryState
          query={query}
          isEmpty={(data) => data.content.length === 0}
          empty={
            <EmptyState
              icon={SearchX}
              title={filtered ? 'No incidents match these filters' : 'No incidents yet'}
              description={filtered ? 'Loosen a filter or clear them all.' : undefined}
              action={
                filtered ? (
                  <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams())}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(data) => (
            <div className="space-y-3">
              <IncidentTable incidents={data.content} dimmed={query.isPlaceholderData} />
              <Pager
                page={filters.page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                pageSize={SEARCH_PAGE_SIZE}
                onPage={(next) => update({ page: next })}
              />
            </div>
          )}
        </QueryState>
      )}
    </div>
  )
}
