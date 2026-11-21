import { apiFetch } from './client'
import type { CategoryResponse } from './types'

/** GET /api/categories: the categories an incident can be filed under. */
export function getCategories(): Promise<CategoryResponse[]> {
  return apiFetch<CategoryResponse[]>('/api/categories')
}
