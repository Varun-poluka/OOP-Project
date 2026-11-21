import { describe, expect, it } from 'vitest'
import type { ReportSummary, SlaSummary } from '@/api/types'
import {
  NO_DATA,
  categoryBars,
  complianceBars,
  formatMinutes,
  formatPercent,
  kpis,
  priorityBars,
  statusBars,
  workloadBars,
} from './reportCharts'

const EMPTY_SLA: SlaSummary = {
  incidents: 0,
  responseCompliance: null,
  resolutionCompliance: null,
  meanMinutesToAcknowledge: null,
  meanMinutesToResolve: null,
}

function summary(overrides: Partial<ReportSummary> = {}): ReportSummary {
  return {
    from: '2026-10-23T00:00:00',
    to: '2026-11-22T00:00:00',
    totalIncidents: 0,
    byStatus: [],
    byPriority: [],
    byCategory: [],
    overall: EMPTY_SLA,
    byPriorityPerformance: {},
    technicians: [],
    openIncidents: 0,
    openByPriority: { P1: 0, P2: 0, P3: 0, P4: 0 },
    ...overrides,
  }
}

describe('statusBars', () => {
  it('lists every status in lifecycle order, with zeros for missing ones', () => {
    const bars = statusBars(summary({ byStatus: [{ key: 'CLOSED', count: 2 }, { key: 'NEW', count: 5 }] }))
    expect(bars.map((bar) => bar.key)).toEqual([
      'NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED',
    ])
    expect(bars[0]).toEqual({ key: 'NEW', label: 'New', count: 5 })
    expect(bars[1].count).toBe(0)
    expect(bars[7].count).toBe(2)
  })
})

describe('priorityBars', () => {
  it('is P1-P4 in order and adds Unclassified only when there are some', () => {
    expect(priorityBars(summary({ byPriority: [{ key: 'P3', count: 1 }] })).map((bar) => bar.key)).toEqual([
      'P1', 'P2', 'P3', 'P4',
    ])
    const bars = priorityBars(summary({ byPriority: [{ key: 'UNCLASSIFIED', count: 4 }] }))
    expect(bars.at(-1)).toEqual({ key: 'UNCLASSIFIED', label: 'Unclassified', count: 4, priority: null })
  })
})

describe('categoryBars', () => {
  it('drops empty categories and sorts by count, then name', () => {
    const bars = categoryBars(
      summary({
        byCategory: [
          { key: 'Software', count: 2 },
          { key: 'Access', count: 0 },
          { key: 'Network', count: 5 },
          { key: 'Hardware', count: 2 },
        ],
      }),
    )
    expect(bars.map((bar) => bar.label)).toEqual(['Network', 'Hardware', 'Software'])
  })
})

describe('complianceBars', () => {
  it('keeps "no data" as null, never 0, and rounds to one decimal', () => {
    const bars = complianceBars(
      summary({
        byPriorityPerformance: {
          P1: { ...EMPTY_SLA, incidents: 3, responseCompliance: 66.6666, resolutionCompliance: 0 },
          P2: { ...EMPTY_SLA, incidents: 2 },
        },
      }),
      'response',
    )
    expect(bars).toEqual([
      { priority: 'P1', label: 'P1', percent: 66.7, incidents: 3 },
      { priority: 'P2', label: 'P2', percent: null, incidents: 2 },
      { priority: 'P3', label: 'P3', percent: null, incidents: 0 },
      { priority: 'P4', label: 'P4', percent: null, incidents: 0 },
    ])
  })

  it('a real 0% stays 0 (every incident missed), distinct from no data', () => {
    const bars = complianceBars(
      summary({ byPriorityPerformance: { P1: { ...EMPTY_SLA, incidents: 3, resolutionCompliance: 0 } } }),
      'resolution',
    )
    expect(bars[0].percent).toBe(0)
  })
})

describe('workloadBars', () => {
  it('sorts by open work, then name', () => {
    const bars = workloadBars(
      summary({
        technicians: [
          { id: 'b', name: 'Bala', available: true, openIncidents: 1, resolvedIncidents: 4 },
          { id: 'a', name: 'Asha', available: false, openIncidents: 1, resolvedIncidents: 0 },
          { id: 'c', name: 'Chen', available: true, openIncidents: 3, resolvedIncidents: 1 },
        ],
      }),
    )
    expect(bars.map((bar) => bar.name)).toEqual(['Chen', 'Asha', 'Bala'])
    expect(bars[1]).toEqual({ id: 'a', name: 'Asha', available: false, open: 1, resolved: 0 })
  })
})

describe('kpis and formatting', () => {
  it('takes the "right now" counts from openIncidents/openByPriority', () => {
    const result = kpis(summary({ openIncidents: 9, openByPriority: { P1: 2, P2: 3, P3: 4, P4: 0 } }))
    expect(result.openNow).toBe(9)
    expect(result.openP1Now).toBe(2)
    expect(result.responseCompliance).toBeNull()
  })

  it('shows null as "No data", never as 0', () => {
    expect(formatPercent(null)).toBe(NO_DATA)
    expect(formatMinutes(null)).toBe(NO_DATA)
    expect(formatPercent(0)).toBe('0%')
  })

  it('formats percentages and minutes', () => {
    expect(formatPercent(92.456)).toBe('92.5%')
    expect(formatMinutes(85)).toBe('1h 25m')
    expect(formatMinutes(0.5)).toBe('<1m')
  })
})
