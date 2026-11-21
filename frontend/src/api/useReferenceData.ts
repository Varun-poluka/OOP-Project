import { useQuery } from '@tanstack/react-query'
import { getCategories } from './categories'
import { queryKeys } from './queryKeys'
import { servicesApi } from './services'
import { techniciansApi } from './technicians'

// Lists that rarely change. Cached for 5 minutes so every form reuses one request.
const FIVE_MINUTES = 5 * 60 * 1000

export function useServices() {
  return useQuery({ queryKey: queryKeys.services(), queryFn: servicesApi.list, staleTime: FIVE_MINUTES })
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: getCategories, staleTime: FIVE_MINUTES })
}

export function useTechnicians() {
  return useQuery({ queryKey: queryKeys.technicians(), queryFn: techniciansApi.list, staleTime: FIVE_MINUTES })
}
