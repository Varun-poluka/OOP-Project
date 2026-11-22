import { z } from 'zod'
import type { CreateCategoryRequest } from '@/api/types'

// Mirrors CreateCategoryRequest: the name becomes the id (stored uppercase), so letters, digits, _.
export const CATEGORY_NAME_MAX = 40
export const CATEGORY_DESCRIPTION_MAX = 200

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a name.')
    .max(CATEGORY_NAME_MAX, `Keep the name under ${CATEGORY_NAME_MAX} characters.`)
    .regex(/^[A-Za-z0-9_]+$/, 'Use letters, digits and _ only (no spaces).'),
  description: z.string().trim().max(CATEGORY_DESCRIPTION_MAX, `Keep the description under ${CATEGORY_DESCRIPTION_MAX} characters.`),
})

export type CategoryFormValues = z.output<typeof categorySchema>

export function toCreateCategoryRequest(values: CategoryFormValues): CreateCategoryRequest {
  return {
    name: values.name.toUpperCase(),
    description: values.description.length > 0 ? values.description : undefined,
  }
}
