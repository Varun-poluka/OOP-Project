import { useState } from 'react'
import { Link } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowRight, ScrollText } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { queryKeys } from '@/api/queryKeys'
import { DebouncedInput } from '@/components/DebouncedInput'
import { EmptyState } from '@/components/EmptyState'
import { ALL, FilterSelect } from '@/components/FilterSelect'
import { PageHeader } from '@/components/PageHeader'
import { QueryState } from '@/components/QueryState'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AUDIT_ACTIONS,
  AUDIT_PAGE_SIZE,
  NO_AUDIT_FILTERS,
  SYSTEM_ACTOR,
  dateRangeError,
  toAuditCriteria,
  type AuditFilters,
} from '@/features/admin/auditFilters'
import { Pager } from '@/features/incidents/IncidentTable'
import { humaniseAction } from '@/lib/labels'
import { formatDateTime } from '@/lib/time'
import { cn } from '@/lib/utils'

/** Every incident's audit records in one list, newest first, with filters and paging. */
export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>(NO_AUDIT_FILTERS)
  // 1-based on screen (like the search page); the backend's page is 0-based.
  const [page, setPage] = useState(1)
  const users = useQuery({ queryKey: queryKeys.users(), queryFn: adminApi.users })
  const rangeError = dateRangeError(filters)
  const criteria = toAuditCriteria(filters)

  const audit = useQuery({
    queryKey: queryKeys.audit(criteria, page),
    queryFn: () => adminApi.audit(criteria, page - 1, AUDIT_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled: rangeError === null,
  })

  // Any filter change starts again at page 1.
  function update(changes: Partial<AuditFilters>) {
    setFilters((current) => ({ ...current, ...changes }))
    setPage(1)
  }

  const userOptions = [
    { value: SYSTEM_ACTOR, label: 'SYSTEM (automatic)' },
    ...(users.data ?? []).map((u) => ({ value: u.id, label: `${u.name} (${u.id})` })),
  ]
  const filtered = Object.keys(criteria).length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Who did what to which incident, and when. Records are written by the system and cannot be edited."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="audit-incident" className="block text-xs text-muted-foreground">
            Incident
          </label>
          <DebouncedInput
            id="audit-incident"
            className="h-9 w-36 font-mono"
            placeholder="INC-0022"
            value={filters.incidentId}
            onCommit={(value) => update({ incidentId: value.trim() })}
          />
        </div>
        <FilterSelect
          label="User"
          className="w-56"
          value={filters.actorId === '' ? ALL : filters.actorId}
          onChange={(value) => update({ actorId: value === ALL ? '' : value })}
          allLabel="Everyone"
          options={userOptions}
        />
        <FilterSelect
          label="Action"
          className="w-52"
          value={filters.action === '' ? ALL : filters.action}
          onChange={(value) => update({ action: value === ALL ? '' : value })}
          allLabel="All actions"
          options={AUDIT_ACTIONS.map((action) => ({ value: action, label: humaniseAction(action) }))}
        />
        <div className="space-y-1">
          <label htmlFor="audit-from" className="block text-xs text-muted-foreground">
            From
          </label>
          <Input id="audit-from" type="date" className="h-9 w-40" value={filters.fromDate} onChange={(e) => update({ fromDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-to" className="block text-xs text-muted-foreground">
            To
          </label>
          <Input id="audit-to" type="date" className="h-9 w-40" value={filters.toDate} onChange={(e) => update({ toDate: e.target.value })} />
        </div>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={() => update(NO_AUDIT_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

      {rangeError !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : (
        <QueryState
          query={audit}
          isEmpty={(data) => data.totalElements === 0}
          empty={<EmptyState icon={ScrollText} title="No audit records match" description="Try fewer filters or a wider date range." />}
        >
          {(data) => (
            <div className={cn('space-y-3 transition-opacity', audit.isPlaceholderData && 'opacity-60')}>
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full min-w-[56rem] text-left">
                  <caption className="sr-only">Audit records, newest first</caption>
                  <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="w-44 px-4 py-2.5 font-medium">When</th>
                      <th scope="col" className="w-28 px-4 py-2.5 font-medium">Incident</th>
                      <th scope="col" className="w-44 px-4 py-2.5 font-medium">User</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Action</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {data.content.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap tabular">{formatDateTime(entry.timestamp)}</td>
                        <td className="px-4 py-2.5">
                          {entry.incidentId === null ? (
                            '—'
                          ) : (
                            <Link to={`/incidents/${encodeURIComponent(entry.incidentId)}`} className="font-mono text-xs hover:underline">
                              {entry.incidentId}
                            </Link>
                          )}
                        </td>
                        <td className={cn('px-4 py-2.5', entry.actorId === null && 'text-muted-foreground')}>{entry.actorName}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{humaniseAction(entry.action)}</p>
                          {entry.previousStatus !== null && entry.newStatus !== null && entry.previousStatus !== entry.newStatus && (
                            <span className="mt-1 flex items-center gap-1">
                              <StatusBadge status={entry.previousStatus} />
                              <ArrowRight aria-label="to" className="size-3 text-muted-foreground" />
                              <StatusBadge status={entry.newStatus} />
                            </span>
                          )}
                        </td>
                        <td className="max-w-md px-4 py-2.5 text-muted-foreground">
                          <span className="line-clamp-2">{entry.description ?? ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                page={page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                pageSize={AUDIT_PAGE_SIZE}
                onPage={setPage}
              />
            </div>
          )}
        </QueryState>
      )}
    </div>
  )
}
