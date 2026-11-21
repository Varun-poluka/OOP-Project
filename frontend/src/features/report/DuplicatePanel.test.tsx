import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { DuplicateCandidate } from '@/api/types'
import { DuplicatePanel } from './DuplicatePanel'

function renderPanel(candidates: DuplicateCandidate[], checking = false) {
  return render(
    <MemoryRouter>
      <DuplicatePanel candidates={candidates} checking={checking} />
    </MemoryRouter>,
  )
}

const employeeView: DuplicateCandidate[] = [
  { incidentId: 'INC-0007', title: 'VPN keeps disconnecting', status: 'IN_PROGRESS' },
  { incidentId: 'INC-0003', title: 'Cannot reach VPN from home', status: 'ASSIGNED' },
]

describe('DuplicatePanel', () => {
  it('renders nothing when there are no candidates', () => {
    const { container } = renderPanel([])
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each candidate as a link to its incident, with its status', () => {
    renderPanel(employeeView)

    expect(screen.getByRole('heading', { name: 'Possibly already reported' })).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/incidents/INC-0007')
    expect(within(links[0]).getByText('VPN keeps disconnecting')).toBeInTheDocument()
    expect(within(links[0]).getByText('In progress')).toBeInTheDocument()
    expect(within(links[1]).getByText('Assigned')).toBeInTheDocument()
  })

  it('hides score and reasons when the backend leaves them out (employees)', () => {
    renderPanel(employeeView)
    expect(screen.queryByText(/% match/)).not.toBeInTheDocument()
    for (const link of screen.getAllByRole('link')) {
      expect(within(link).queryByRole('list')).not.toBeInTheDocument() // no reasons list inside
    }
  })

  it('shows score and reasons when present (technicians and admins)', () => {
    renderPanel([
      { incidentId: 'INC-0007', title: 'VPN keeps disconnecting', status: 'NEW', score: 0.82, reasons: ['Same service', 'Similar title'] },
    ])
    expect(screen.getByText(/82% match/)).toBeInTheDocument()
    expect(screen.getByText('Same service')).toBeInTheDocument()
    expect(screen.getByText('Similar title')).toBeInTheDocument()
  })

  it('shows a spinner while a newer check runs, keeping the old results', () => {
    renderPanel(employeeView, true)
    expect(screen.getByLabelText('Checking')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })
})
