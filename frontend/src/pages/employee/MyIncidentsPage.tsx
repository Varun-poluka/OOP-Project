import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FilePlus2, ListChecks, Search, SearchX } from 'lucide-react'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import { INCIDENT_STATUSES, PRIORITIES } from '@/api/types'
import { EmptyState } from '@/components/EmptyState'
import { ALL, FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IncidentTable, Pager } from '@/features/incidents/IncidentTable'
import {
  PAGE_SIZE,
  SORT_OPTIONS,
  hasActiveFilters,
  readListFilters,
  toSearchRequest,
  writeListFilters,
  type ListFilters,
  type SortKey,
} from '@/features/incidents/listParams'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'

export function MyIncidentsPage() {
  // The URL is the single source of truth for the filters.
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readListFilters(searchParams)

  function update(changes: Partial<ListFilters>) {
    // Read the *latest* URL (prev), not the `filters` from when this function was created:
    // the text box calls this 400 ms later, and another filter may have changed meanwhile.
    // Any filter change goes back to page 1, unless the change *is* the page.
    setSearchParams((prev) => writeListFilters({ ...readListFilters(prev), page: 1, ...changes }))
  }

  // The text box shows what is typed immediately, but updates the URL (and so the search)
  // only 400 ms after typing stops.
  const [text, setText] = useState(filters.text)
  const textTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(textTimer.current), []) // cancel a pending update on leaving the page

  function onTextChange(value: string) {
    setText(value)
    clearTimeout(textTimer.current)
    textTimer.current = setTimeout(() => update({ text: value }), 400)
  }

  // If the URL's text changes from elsewhere (Back button, Clear filters), show it in the box.
  // This is React's "adjust state while rendering" pattern: compare with the last value we saw.
  const [seenUrlText, setSeenUrlText] = useState(filters.text)
  if (filters.text !== seenUrlText) {
    setSeenUrlText(filters.text)
    if (text.trim() !== filters.text) setText(filters.text)
  }

  const { criteria, page } = toSearchRequest(filters)
  const query = useQuery({
    queryKey: queryKeys.incidentSearch(criteria, page),
    queryFn: () => incidentsApi.search(criteria, page),
    placeholderData: keepPreviousData, // keep the old page visible while the next one loads
  })

  const filtered = hasActiveFilters(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Employee"
        title="My incidents"
        description="Everything you have reported, with its status and SLA."
        actions={
          <Button asChild>
            <Link to="/incidents/new">
              <FilePlus2 />
              Report incident
            </Link>
          </Button>
        }
      />

      <div role="search" className="flex flex-wrap items-end gap-3">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search title and description</span>
          <Search aria-hidden className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Search title and description"
            className="h-9 pl-8"
          />
        </label>
        <FilterSelect
          label="Status"
          value={filters.status ?? ALL}
          onChange={(value) => update({ status: value === ALL ? null : (value as ListFilters['status']) })}
          options={INCIDENT_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
          allLabel="All statuses"
        />
        <FilterSelect
          label="Priority"
          value={filters.priority ?? ALL}
          onChange={(value) => update({ priority: value === ALL ? null : (value as ListFilters['priority']) })}
          options={PRIORITIES.map((priority) => ({ value: priority, label: `${priority} · ${PRIORITY_LABEL[priority]}` }))}
          allLabel="All priorities"
        />
        <FilterSelect
          label="Sort"
          value={filters.sort}
          onChange={(value) => update({ sort: value as SortKey })}
          options={(Object.keys(SORT_OPTIONS) as SortKey[]).map((key) => ({ value: key, label: SORT_OPTIONS[key].label }))}
        />
      </div>

      <QueryState
        query={query}
        isEmpty={(data) => data.content.length === 0}
        empty={
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No incidents match these filters"
              description="Try a different status, priority or search text."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    clearTimeout(textTimer.current) // a pending text update must not undo the clear
                    setSearchParams(new URLSearchParams())
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={ListChecks}
              title="You haven't reported anything yet"
              description="When something IT-related breaks, report it here and follow its progress."
              action={
                <Button asChild>
                  <Link to="/incidents/new">
                    <FilePlus2 />
                    Report incident
                  </Link>
                </Button>
              }
            />
          )
        }
      >
        {(data) => (
          <div className="space-y-3">
            <IncidentTable incidents={data.content} dimmed={query.isPlaceholderData} />
            <Pager
              page={filters.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              pageSize={PAGE_SIZE}
              onPage={(next) => update({ page: next })}
            />
          </div>
        )}
      </QueryState>
    </div>
  )
}
