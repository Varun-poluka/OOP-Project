import type { ImpactResponse, ServiceResponse } from '@/api/types'

// Lays out the impact graph of one service outage for an SVG drawing.
//
// The backend's impact search is a breadth-first search (BFS): it starts at the failed service and
// walks "who depends on me?" one hop at a time, so `distance` is the number of hops. We place the
// failed service in column 0 and every impacted service in the column of its distance. Inside a
// column, services are sorted by name, so the same data always gives the same picture
// (a "deterministic" layout: no randomness, no dependence on the order the API returned).
//
// Edges point the way an outage spreads: from a service to the services that depend on it.
// An edge going to the next column is how BFS first reached that service (solid). Any other
// edge reaches a service that was already reached at the same or a shorter distance, which is
// what a cycle or a second path looks like; those are marked `revisited` and drawn dashed.

export const NODE_WIDTH = 168
export const NODE_HEIGHT = 44
export const COLUMN_GAP = 72
export const ROW_GAP = 16
export const PADDING = 16

export type LayoutNode = {
  id: number
  name: string
  businessCriticality: number
  distance: number
  /** Top-left corner. */
  x: number
  y: number
  isOutage: boolean
}

export type LayoutEdge = {
  /** The service whose outage spreads ... */
  fromId: number
  /** ... to this service, which depends on it. */
  toId: number
  revisited: boolean
}

export type ImpactLayout = {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
  /** The y of the empty lane under all boxes that backward edges travel along (see edgePath). */
  laneY: number
  /** One entry per column, left to right: its hop distance and the x of its boxes. */
  columns: { distance: number; x: number }[]
}

/** The x of the boxes in the n-th column (0 = the failed service). */
export function columnX(columnIndex: number): number {
  return PADDING + columnIndex * (NODE_WIDTH + COLUMN_GAP)
}

/**
 * @param impact   GET /api/services/{id}/impact (the failed service and every impacted one, with distances)
 * @param services GET /api/services (each service's direct dependencies, which give us the edges)
 */
export function layoutImpact(impact: ImpactResponse, services: readonly ServiceResponse[]): ImpactLayout {
  // 1. Every node with its distance. The failed service is distance 0.
  const outage = services.find((service) => service.id === impact.serviceId)
  const distanceById = new Map<number, number>([[impact.serviceId, 0]])
  const unplaced: Omit<LayoutNode, 'x' | 'y'>[] = [
    {
      id: impact.serviceId,
      name: impact.serviceName,
      businessCriticality: outage === undefined ? 1 : outage.businessCriticality,
      distance: 0,
      isOutage: true,
    },
  ]
  for (const item of impact.impacted) {
    if (distanceById.has(item.id)) continue // defensive: each service once
    distanceById.set(item.id, item.distance)
    unplaced.push({
      id: item.id,
      name: item.name,
      businessCriticality: item.businessCriticality,
      distance: item.distance,
      isOutage: false,
    })
  }

  // 2. Group by distance (column), sort each column by name (then id, in case two share a name).
  const byColumn = new Map<number, Omit<LayoutNode, 'x' | 'y'>[]>()
  for (const node of unplaced) {
    const column = byColumn.get(node.distance) ?? []
    column.push(node)
    byColumn.set(node.distance, column)
  }
  const columnNumbers = [...byColumn.keys()].sort((a, b) => a - b)

  // 3. Positions: x from the column, y from the place in the column.
  const nodes: LayoutNode[] = []
  let tallestColumn = 0
  columnNumbers.forEach((distance, columnIndex) => {
    const column = byColumn.get(distance) ?? []
    column.sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id)
    tallestColumn = Math.max(tallestColumn, column.length)
    column.forEach((node, rowIndex) => {
      nodes.push({
        ...node,
        x: columnX(columnIndex),
        y: PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP),
      })
    })
  })

  // 4. Edges: "S depends on D" means an outage of D spreads to S, so the edge is D -> S.
  //    Only edges between two services in this graph are drawn.
  const edges: LayoutEdge[] = []
  for (const service of services) {
    const toDistance = distanceById.get(service.id)
    if (toDistance === undefined) continue
    for (const dependency of service.dependsOn) {
      const fromDistance = distanceById.get(dependency.id)
      if (fromDistance === undefined) continue
      edges.push({ fromId: dependency.id, toId: service.id, revisited: toDistance !== fromDistance + 1 })
    }
  }
  edges.sort((a, b) => a.fromId - b.fromId || a.toId - b.toId)

  const columnCount = columnNumbers.length
  const boxesBottom = PADDING + tallestColumn * NODE_HEIGHT + Math.max(0, tallestColumn - 1) * ROW_GAP
  // A backward edge runs along a lane under the boxes, so leave room for it only when there is one.
  const hasBackwardEdge = edges.some((edge) => {
    const toDistance = distanceById.get(edge.toId) ?? 0
    const fromDistance = distanceById.get(edge.fromId) ?? 0
    return toDistance < fromDistance
  })
  const laneY = boxesBottom + ROW_GAP
  return {
    nodes,
    edges,
    laneY,
    columns: columnNumbers.map((distance, index) => ({ distance, x: columnX(index) })),
    width: PADDING * 2 + columnCount * NODE_WIDTH + Math.max(0, columnCount - 1) * COLUMN_GAP,
    height: (hasBackwardEdge ? laneY : boxesBottom) + PADDING,
  }
}

/**
 * The SVG path of an edge, routed so it never runs through another box. Three cases:
 *  - forward (to the next column): an S-curve from the right side of one box to the left side of the next
 *  - same column: a bow out into the empty gap to the right of the column, from one box's right side to the other's
 *  - backward (to an earlier column, e.g. a cycle back to the outage): out of the box's left side into the
 *    gap, down that gap to the lane under all boxes, left along the lane to the gap right of the target's
 *    column, up that gap, and into the target's right side. Gaps and the lane hold no boxes, so nothing
 *    is crossed. When the two gaps are the same one (target in the column just before), the lane is skipped.
 */
export function edgePath(from: LayoutNode, to: LayoutNode, laneY: number): string {
  const startY = from.y + NODE_HEIGHT / 2
  const endY = to.y + NODE_HEIGHT / 2
  if (to.x > from.x) {
    const startX = from.x + NODE_WIDTH
    const endX = to.x
    const bend = (endX - startX) / 2
    return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
  }
  if (to.x === from.x) {
    const rightX = from.x + NODE_WIDTH
    // Boxes further apart bow out further, so nested bows don't sit on top of each other.
    const rowsApart = Math.abs(to.y - from.y) / (NODE_HEIGHT + ROW_GAP)
    const bow = Math.min(COLUMN_GAP - 8, 16 + rowsApart * 8)
    return `M ${rightX} ${startY} C ${rightX + bow} ${startY}, ${rightX + bow} ${endY}, ${rightX} ${endY}`
  }
  const sourceGapX = from.x - COLUMN_GAP / 2
  const targetGapX = to.x + NODE_WIDTH + COLUMN_GAP / 2
  const endX = to.x + NODE_WIDTH
  if (sourceGapX === targetGapX) return `M ${from.x} ${startY} H ${sourceGapX} V ${endY} H ${endX}`
  return `M ${from.x} ${startY} H ${sourceGapX} V ${laneY} H ${targetGapX} V ${endY} H ${endX}`
}
