import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { incidentsApi } from '@/api/incidents'
import { queryKeys } from '@/api/queryKeys'
import type { DuplicateCheckRequest } from '@/api/types'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

export const DUPLICATE_DEBOUNCE_MS = 600
/** Very short titles match too much to be useful. */
export const DUPLICATE_MIN_TITLE = 4

type DuplicateInput = { title: string; description: string; categoryName: string; serviceId: string }

/**
 * Checks for similar incidents ~600 ms after the user stops typing.
 * The request object is rebuilt only when one of its four values changes (useMemo);
 * otherwise a new object on every render would restart the debounce timer forever.
 */
export function useDuplicateCheck({ title, description, categoryName, serviceId }: DuplicateInput) {
  const request = useMemo<DuplicateCheckRequest>(
    () => ({
      title: title.trim(),
      description: description.trim() || undefined,
      categoryName: categoryName || undefined,
      affectedServiceId: serviceId === '' ? undefined : Number(serviceId),
    }),
    [title, description, categoryName, serviceId],
  )
  const debounced = useDebouncedValue(request, DUPLICATE_DEBOUNCE_MS)

  return useQuery({
    queryKey: queryKeys.duplicates(debounced),
    // TanStack Query passes an AbortSignal: if the key changes mid-request, the old one is cancelled.
    queryFn: ({ signal }) => incidentsApi.checkDuplicates(debounced, signal),
    enabled: debounced.title.length >= DUPLICATE_MIN_TITLE,
    placeholderData: keepPreviousData, // keep showing the last result while the next one loads
    retry: false, // it is only a hint; don't hammer the server
    staleTime: 30_000,
  })
}
