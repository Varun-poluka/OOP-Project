import { describe, expect, it } from 'vitest'
import type { RiskLevel } from '@/api/types'
import { sortAtRisk } from './atRisk'

const row = (id: string, riskLevel: RiskLevel, slaPercentUsed: number | null) => ({ id, riskLevel, slaPercentUsed })

describe('sortAtRisk', () => {
  it('puts breached first, then the most time used, and no clock last', () => {
    const sorted = sortAtRisk([
      row('a', 'MEDIUM', 70),
      row('b', 'BREACHED', 105),
      row('c', 'HIGH', 92),
      row('d', 'LOW', null),
      row('e', 'BREACHED', 130),
    ])
    expect(sorted.map((r) => r.id)).toEqual(['e', 'b', 'c', 'a', 'd'])
  })

  it('does not change the array it is given', () => {
    const input = [row('a', 'LOW', 10), row('b', 'HIGH', 90)]
    sortAtRisk(input)
    expect(input.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
