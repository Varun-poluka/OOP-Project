import type { DefaultValues } from 'react-hook-form'
import { z } from 'zod'
import { IMPACTS, URGENCIES, type CreateIncidentRequest } from '@/api/types'

// The report form's rules, written once with zod. The same object validates in the browser
// (through react-hook-form) and gives us the TypeScript type of the form values.
// Limits copied from CreateIncidentRequest (@NotBlank @Size(max = 200) title, etc.).
export const TITLE_MAX = 200
export const DESCRIPTION_MAX = 2000

export const reportSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a short title.')
    .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`),
  description: z.string().trim().max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters.`),
  categoryName: z.string().min(1, 'Choose a category.'),
  // Select boxes hold text, so the service id is a string here and becomes a number in toRequest.
  serviceId: z.string().regex(/^\d+$/, 'Choose the affected service.'),
  impact: z.enum(IMPACTS, { error: 'Choose how many people are affected.' }),
  urgency: z.enum(URGENCIES, { error: 'Choose how urgent it is.' }),
})

/** What the user typed (impact/urgency may still be unset). */
export type ReportFormInput = z.input<typeof reportSchema>
/** What validation produces: trimmed text, impact/urgency guaranteed set. */
export type ReportFormValues = z.output<typeof reportSchema>

// impact and urgency start unset, so the user has to choose them (no silent default).
export const EMPTY_REPORT_FORM: DefaultValues<ReportFormInput> = {
  title: '',
  description: '',
  categoryName: '',
  serviceId: '',
}

/** Turns validated form values into the request body for POST /api/incidents. */
export function toCreateRequest(values: ReportFormValues): CreateIncidentRequest {
  return {
    title: values.title,
    description: values.description.length > 0 ? values.description : undefined,
    categoryName: values.categoryName,
    serviceId: Number(values.serviceId),
    impact: values.impact,
    urgency: values.urgency,
  }
}
