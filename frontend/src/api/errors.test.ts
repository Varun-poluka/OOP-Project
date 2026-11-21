import { describe, expect, it } from 'vitest'
import { ApiError, errorMessage, formatValidationDetail, toReadableMessage } from './errors'

describe('toReadableMessage', () => {
  it('uses the ProblemDetail detail when present', () => {
    const message = toReadableMessage(404, { status: 404, title: 'Not Found', detail: 'Incident INC-9 not found' })
    expect(message).toBe('Incident INC-9 not found')
  })

  it('reformats the backend validation detail into sentences', () => {
    const detail = 'title: must not be blank; serviceId: must not be null; '
    expect(toReadableMessage(400, { status: 400, detail })).toBe(
      'Title: must not be blank. Service id: must not be null.',
    )
  })

  it('keeps a 400 detail that is not in field format unchanged', () => {
    expect(toReadableMessage(400, { detail: 'from must be before to' })).toBe('from must be before to')
  })

  it('uses a custom title when there is no detail', () => {
    expect(toReadableMessage(409, { title: 'Incident already closed' })).toBe('Incident already closed')
  })

  it('ignores Spring default titles and falls back to a friendly sentence', () => {
    expect(toReadableMessage(403, { title: 'Forbidden', status: 403 })).toBe("You don't have permission to do that.")
  })

  it('falls back to a status message when there is no body', () => {
    expect(toReadableMessage(500, null)).toBe('Server error. Please try again later.')
    expect(toReadableMessage(418, null)).toBe('Request failed (HTTP 418).')
  })

  it('treats a blank detail as missing', () => {
    expect(toReadableMessage(404, { detail: '   ' })).toBe('That item was not found.')
  })
})

describe('formatValidationDetail', () => {
  it('returns null for text that is not field: message pairs', () => {
    expect(formatValidationDetail('something broke')).toBeNull()
    expect(formatValidationDetail('; ;')).toBeNull()
  })
})

describe('errorMessage', () => {
  it('reads ApiError, Error and unknown values', () => {
    expect(errorMessage(new ApiError(400, 'Bad input'))).toBe('Bad input')
    expect(errorMessage(new Error('boom'))).toBe('boom')
    expect(errorMessage('a string')).toBe('Something went wrong.')
  })
})
