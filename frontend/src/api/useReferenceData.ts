import { useQuery } from '@tanstack/react-query'
import { getCategories } from './categories'
import { queryKeys } from './queryKeys'
import { servicesApi } from './services'
import { techniciansApi } from './technicians'

// Lists that rarely change. Cached for 5 minutes so every form reuses one request.
// After an admin edits one, the page invalidates its key, so this browser refetches at once.
const FIVE_MINUTES = 5 * 60 * 1000

export function useServices() {
  return useQuery({ queryKey: queryKeys.services(), queryFn: servicesApi.list, staleTime: FIVE_MINUTES })
}

// Categories use the app-wide 30 s staleTime instead: an admin can add one at any time, and
// the report form should offer it soon in other people's browsers too.
export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: getCategories })
}

export function useTechnicians() {
  return useQuery({ queryKey: queryKeys.technicians(), queryFn: techniciansApi.list, staleTime: FIVE_MINUTES })
}
