import { describe, expect, it } from 'vitest'
import type { ImpactResponse, ServiceResponse } from '@/api/types'
import { COLUMN_GAP, NODE_HEIGHT, NODE_WIDTH, PADDING, ROW_GAP, edgePath, layoutImpact } from './impactLayout'

function service(id: number, name: string, dependsOn: number[] = []): ServiceResponse {
  return {
    id,
    name,
    businessCriticality: 2,
    dependsOn: dependsOn.map((dep) => ({ id: dep, name: `S${dep}` })),
    openIncidentCount: 0,
  }
}

// Network (1) <- Email (2), VPN (3); Email (2) <- Payroll (4). VPN also depends on Email (sideways).
const SERVICES = [service(1, 'Network'), service(2, 'Email', [1]), service(3, 'VPN', [1, 2]), service(4, 'Payroll', [2])]
const IMPACT: ImpactResponse = {
  serviceId: 1,
  serviceName: 'Network',
  impactedCount: 3,
  // Deliberately not sorted, to show the layout does not depend on API order.
  impacted: [
    { id: 3, name: 'VPN', businessCriticality: 2, distance: 1 },
    { id: 4, name: 'Payroll', businessCriticality: 2, distance: 2 },
    { id: 2, name: 'Email', businessCriticality: 2, distance: 1 },
  ],
}

describe('layoutImpact', () => {
  it('puts the failed service in column 0 and each impacted service in the column of its distance', () => {
    const layout = layoutImpact(IMPACT, SERVICES)
    const x = (id: number) => layout.nodes.find((node) => node.id === id)?.x
    expect(x(1)).toBe(PADDING)
    expect(x(2)).toBe(PADDING + NODE_WIDTH + COLUMN_GAP)
    expect(x(3)).toBe(PADDING + NODE_WIDTH + COLUMN_GAP)
    expect(x(4)).toBe(PADDING + 2 * (NODE_WIDTH + COLUMN_GAP))
    expect(layout.columns.map((column) => column.distance)).toEqual([0, 1, 2])
    expect(layout.nodes.find((node) => node.id === 1)?.isOutage).toBe(true)
  })

  it('sorts each column by name, whatever order the API used', () => {
    const layout = layoutImpact(IMPACT, SERVICES)
    const email = layout.nodes.find((node) => node.id === 2)
    const vpn = layout.nodes.find((node) => node.id === 3)
    expect(email?.y).toBe(PADDING)
    expect(vpn?.y).toBe(PADDING + NODE_HEIGHT + ROW_GAP)
  })

  it('gives the same layout for the same data in any input order', () => {
    const shuffled = { ...IMPACT, impacted: [...IMPACT.impacted].reverse() }
    expect(layoutImpact(shuffled, [...SERVICES].reverse())).toEqual(layoutImpact(IMPACT, SERVICES))
  })

  it('draws edges the way an outage spreads and marks a sideways edge as revisited', () => {
    const { edges } = layoutImpact(IMPACT, SERVICES)
    expect(edges).toEqual([
      { fromId: 1, toId: 2, revisited: false },
      { fromId: 1, toId: 3, revisited: false },
      { fromId: 2, toId: 3, revisited: true }, // VPN was already reached at distance 1
      { fromId: 2, toId: 4, revisited: false },
    ])
  })

  it('marks the edge that closes a cycle back to the failed service as revisited', () => {
    // A depends on B and B depends on A: an outage of A reaches B, and B "reaches" A again.
    const services = [service(10, 'A', [11]), service(11, 'B', [10])]
    const impact: ImpactResponse = {
      serviceId: 10,
      serviceName: 'A',
      impactedCount: 1,
      impacted: [{ id: 11, name: 'B', businessCriticality: 2, distance: 1 }],
    }
    expect(layoutImpact(impact, services).edges).toEqual([
      { fromId: 10, toId: 11, revisited: false },
      { fromId: 11, toId: 10, revisited: true },
    ])
  })

  it('ignores dependencies on services outside the impact graph', () => {
    const services = [...SERVICES, service(9, 'Printer', [8])]
    expect(layoutImpact(IMPACT, services).edges).toHaveLength(4)
  })

  it('is a single box when nothing depends on the service', () => {
    const layout = layoutImpact({ serviceId: 4, serviceName: 'Payroll', impactedCount: 0, impacted: [] }, SERVICES)
    expect(layout.nodes).toHaveLength(1)
    expect(layout.edges).toEqual([])
    expect(layout.width).toBe(PADDING * 2 + NODE_WIDTH)
    expect(layout.height).toBe(PADDING * 2 + NODE_HEIGHT)
  })

  it('adds a lane under the boxes only when an edge points backwards', () => {
    const services = [service(10, 'A', [11]), service(11, 'B', [10])]
    const impact: ImpactResponse = {
      serviceId: 10,
      serviceName: 'A',
      impactedCount: 1,
      impacted: [{ id: 11, name: 'B', businessCriticality: 2, distance: 1 }],
    }
    const layout = layoutImpact(impact, services)
    expect(layout.laneY).toBe(PADDING + NODE_HEIGHT + ROW_GAP)
    expect(layout.height).toBe(layout.laneY + PADDING)
  })
})

describe('edgePath', () => {
  const node = (x: number, y: number) => ({ id: 0, name: '', businessCriticality: 1, distance: 0, x, y, isOutage: false })
  const LANE = 500

  it('runs from the right side of one box to the left side of the next column', () => {
    const path = edgePath(node(0, 0), node(240, 0), LANE)
    expect(path.startsWith(`M ${NODE_WIDTH} ${NODE_HEIGHT / 2}`)).toBe(true)
    expect(path.endsWith(`240 ${NODE_HEIGHT / 2}`)).toBe(true)
  })

  it('bows a same-column edge out to the right, starting and ending on the right sides', () => {
    const path = edgePath(node(0, 0), node(0, NODE_HEIGHT + ROW_GAP), LANE)
    expect(path.startsWith(`M ${NODE_WIDTH} ${NODE_HEIGHT / 2}`)).toBe(true)
    expect(path.endsWith(`${NODE_WIDTH} ${NODE_HEIGHT + ROW_GAP + NODE_HEIGHT / 2}`)).toBe(true)
  })

  it('routes a backward edge out the left side, down a gap, along the lane and up into the target', () => {
    const target = node(PADDING, PADDING)
    const source = node(PADDING + 2 * (NODE_WIDTH + COLUMN_GAP), PADDING)
    const sourceGap = source.x - COLUMN_GAP / 2
    const targetGap = PADDING + NODE_WIDTH + COLUMN_GAP / 2
    const midY = PADDING + NODE_HEIGHT / 2
    expect(edgePath(source, target, LANE)).toBe(
      `M ${source.x} ${midY} H ${sourceGap} V ${LANE} H ${targetGap} V ${midY} H ${PADDING + NODE_WIDTH}`,
    )
  })

  it('skips the lane when the target is in the column just before', () => {
    const target = node(PADDING, PADDING)
    const source = node(PADDING + NODE_WIDTH + COLUMN_GAP, PADDING + NODE_HEIGHT + ROW_GAP)
    const gap = PADDING + NODE_WIDTH + COLUMN_GAP / 2
    expect(edgePath(source, target, LANE)).toBe(
      `M ${source.x} ${source.y + NODE_HEIGHT / 2} H ${gap} V ${PADDING + NODE_HEIGHT / 2} H ${PADDING + NODE_WIDTH}`,
    )
  })
})
