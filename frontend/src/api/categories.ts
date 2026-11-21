import type { CategoryResponse } from './types'

// TODO(backend): replace the body with
//   return apiFetch<CategoryResponse[]>('/api/categories')
// once GET /api/categories exists. Callers already treat this as an async API call
// (through TanStack Query), so nothing else has to change.
// Until then: the categories DataSeeder creates (backend/.../config/DataSeeder.java).
const SEEDED_CATEGORIES: CategoryResponse[] = [
  { name: 'NETWORK', description: 'Network and connectivity issues' },
  { name: 'DATABASE', description: 'Database issues' },
  { name: 'APPLICATION', description: 'Application issues' },
  { name: 'HARDWARE', description: 'Hardware issues' },
]

export async function getCategories(): Promise<CategoryResponse[]> {
  return SEEDED_CATEGORIES
}
