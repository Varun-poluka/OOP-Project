import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { IncidentResponse } from '@/api/types'
import { ActionBar } from './ActionBar'
import { toVerifyCommand } from './feedback'

const incident = { id: 'INC-0040', reporterName: 'Asha Employee', status: 'RESOLVED' } as IncidentResponse

function renderBar(actions: Parameters<typeof ActionBar>[0]['actions']) {
  const run = vi.fn()
  render(<ActionBar incident={incident} actions={actions} pending={false} run={run} />)
  return run
}

describe('toVerifyCommand', () => {
  it('leaves out an empty rating and a blank comment', () => {
    expect(toVerifyCommand(null, '   ')).toEqual({ action: 'verify' })
    expect(toVerifyCommand(4, '  Quick fix ')).toEqual({ action: 'verify', rating: 4, comment: 'Quick fix' })
  })

  it('refuses a rating outside 1-5', () => {
    expect(() => toVerifyCommand(6, '')).toThrow(RangeError)
    expect(() => toVerifyCommand(0, '')).toThrow(RangeError)
  })
})

describe('ActionBar verify with feedback', () => {
  it('verifies without feedback when nothing is filled in', async () => {
    const user = userEvent.setup()
    const run = renderBar(['verify', 'reopen'])
    await user.click(screen.getByRole('button', { name: 'Confirm it works' }))
    await user.click(screen.getByRole('button', { name: 'Yes, it works' }))
    expect(run).toHaveBeenCalledWith({ action: 'verify' }, expect.anything())
  })

  it('sends the chosen stars and the comment', async () => {
    const user = userEvent.setup()
    const run = renderBar(['verify', 'reopen'])
    await user.click(screen.getByRole('button', { name: 'Confirm it works' }))

    await user.click(screen.getByRole('radio', { name: /^4 stars/ }))
    expect(screen.getByRole('radio', { name: /^4 stars/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Very good')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Comment/), 'Fixed the same day')
    await user.click(screen.getByRole('button', { name: 'Yes, it works' }))

    expect(run).toHaveBeenCalledWith({ action: 'verify', rating: 4, comment: 'Fixed the same day' }, expect.anything())
  })

  it('clicking the chosen star again clears the rating', async () => {
    const user = userEvent.setup()
    renderBar(['verify'])
    await user.click(screen.getByRole('button', { name: 'Confirm it works' }))
    await user.click(screen.getByRole('radio', { name: /^2 stars/ }))
    await user.click(screen.getByRole('radio', { name: /^2 stars/ }))
    expect(screen.getByText('No rating')).toBeInTheDocument()
  })
})

describe('ActionBar ask reporter', () => {
  it('needs a question before sending it', async () => {
    const user = userEvent.setup()
    const run = renderBar(['addNote', 'resolve', 'requestInfo'])
    await user.click(screen.getByRole('button', { name: 'Ask reporter' }))
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    expect(screen.getByText('This is required.')).toBeInTheDocument()
    expect(run).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Question'), 'Which room?')
    await user.click(screen.getByRole('button', { name: 'Send question' }))
    expect(run).toHaveBeenCalledWith({ action: 'requestInfo', question: 'Which room?' }, expect.anything())
  })
})
