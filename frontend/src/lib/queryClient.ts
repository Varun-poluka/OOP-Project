import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'

// One shared cache for all server data. Defaults chosen for this app:
//  - staleTime 30 s: data younger than this is shown without refetching
//  - retry: network blips (status 0) and 5xx get up to 2 retries; 4xx never
//    (a 403 or 404 will not fix itself by asking again)
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})
