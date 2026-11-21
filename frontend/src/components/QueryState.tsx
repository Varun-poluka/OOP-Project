import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'

type QueryStateProps<T> = {
  query: UseQueryResult<T>
  /** What to render once data has arrived. */
  children: (data: T) => ReactNode
  /** Shown instead of children when the data counts as empty (e.g. an empty list). */
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  loading?: ReactNode
  errorTitle?: string
}

/**
 * Renders one of the three states every data view has: loading, error, or data
 * (with an optional "empty" case), so each page handles them the same way.
 */
export function QueryState<T>({ query, children, isEmpty, empty, loading, errorTitle }: QueryStateProps<T>) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>
  if (query.isError) return <ErrorState error={query.error} title={errorTitle} onRetry={() => void query.refetch()} />
  if (isEmpty !== undefined && empty !== undefined && isEmpty(query.data)) return <>{empty}</>
  return <>{children(query.data)}</>
}
