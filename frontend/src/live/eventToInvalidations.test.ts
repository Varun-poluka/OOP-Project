import { describe, expect, it } from 'vitest'
import { queryKeys } from '@/api/queryKeys'
import { eventToInvalidations } from './eventToInvalidations'

describe('eventToInvalidations', () => {
  it('"incident" refreshes that incident, every list, the queue, at-risk and reports', () => {
    const update = eventToInvalidations(
      { type: 'incident', data: { incidentId: 'INC-7', action: 'ASSIGNED', status: 'ASSIGNED', priority: 'P1', riskLevel: 'LOW' } },
      'u1',
    )
    expect(update.invalidate).toEqual([
      queryKeys.incident('INC-7'),
      queryKeys.incidentLists(),
      queryKeys.queue(),
      queryKeys.atRisk(),
      queryKeys.reports(),
    ])
    expect(update.set).toEqual([])
  })

  it('"notification" sets the unread count and refreshes the notification list', () => {
    const update = eventToInvalidations({ type: 'notification', data: { unreadCount: 4 } }, 'u1')
    expect(update.set).toEqual([{ queryKey: queryKeys.unreadCount('u1'), data: { unreadCount: 4 } }])
    expect(update.invalidate).toEqual([queryKeys.notifications('u1')])
  })

  it('an unread count of 0 is still written', () => {
    const update = eventToInvalidations({ type: 'notification', data: { unreadCount: 0 } }, 'u1')
    expect(update.set).toHaveLength(1)
  })

  it.each([
    ['connected', { type: 'connected', data: { userId: 'u1' } }],
    ['an unknown event', { type: 'something-new', data: {} }],
    ['an incident without an id', { type: 'incident', data: { status: 'NEW' } }],
    ['an incident with no data', { type: 'incident', data: null }],
    ['a notification without a number', { type: 'notification', data: { unreadCount: 'three' } }],
  ])('does nothing for %s', (_name, event) => {
    expect(eventToInvalidations(event, 'u1')).toEqual({ invalidate: [], set: [] })
  })
})
