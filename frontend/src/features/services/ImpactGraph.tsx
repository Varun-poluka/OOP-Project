import { useId } from 'react'
import { criticalityLabel } from '@/lib/labels'
import { NODE_HEIGHT, NODE_WIDTH, edgePath, type ImpactLayout, type LayoutNode } from './impactLayout'

/**
 * Draws a layout from layoutImpact as SVG. All positions come from the layout (a pure,
 * tested function); this component only turns numbers into shapes.
 * Wide graphs scroll sideways inside their box instead of shrinking the text.
 */
export function ImpactGraph({ layout }: { layout: ImpactLayout }) {
  // Each SVG needs its own marker id, or two graphs on one page would share one arrowhead.
  const arrowId = useId()
  const byId = new Map<number, LayoutNode>(layout.nodes.map((node) => [node.id, node]))

  return (
    <div className="overflow-x-auto">
      {/* Column titles, at the same x as the boxes below them. */}
      <div className="relative h-5 text-xs text-muted-foreground" style={{ width: layout.width }}>
        {layout.columns.map((column) => (
          <span key={column.distance} className="absolute" style={{ left: column.x }}>
            {column.distance === 0 ? 'Outage' : column.distance === 1 ? '1 hop away' : `${column.distance} hops away`}
          </span>
        ))}
      </div>
      <svg
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={`Impact graph: ${layout.nodes.length - 1} services affected`}
        className="block"
      >
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" />
          </marker>
        </defs>

        {layout.edges.map((edge) => {
          const from = byId.get(edge.fromId)
          const to = byId.get(edge.toId)
          if (from === undefined || to === undefined) return null
          return (
            <path
              key={`${edge.fromId}-${edge.toId}`}
              d={edgePath(from, to, layout.laneY)}
              fill="none"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray={edge.revisited ? '5 4' : undefined}
              opacity={edge.revisited ? 0.7 : 1}
              markerEnd={`url(#${arrowId})`}
            />
          )
        })}

        {layout.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <title>{`${node.name}: ${criticalityLabel(node.businessCriticality)} criticality, ${node.distance} hops`}</title>
            <rect
              width={NODE_WIDTH}
              height={NODE_HEIGHT}
              rx={6}
              fill={node.isOutage ? 'color-mix(in oklch, var(--destructive) 14%, var(--card))' : 'var(--card)'}
              stroke={node.isOutage ? 'var(--destructive)' : 'var(--border)'}
              strokeWidth={node.isOutage ? 1.5 : 1}
            />
            <text x={10} y={18} fontSize={12} fontWeight={500} fill="var(--foreground)">
              {truncate(node.name, 22)}
            </text>
            <text x={10} y={34} fontSize={11} fill="var(--muted-foreground)">
              {node.isOutage ? 'Outage' : `${criticalityLabel(node.businessCriticality)} · ${node.distance} hop${node.distance === 1 ? '' : 's'}`}
            </text>
          </g>
        ))}
      </svg>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg width="28" height="6" aria-hidden>
            <line x1="0" y1="3" x2="28" y2="3" stroke="var(--muted-foreground)" strokeWidth="1.5" />
          </svg>
          How the outage first reaches a service
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="28" height="6" aria-hidden>
            <line x1="0" y1="3" x2="28" y2="3" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="5 4" />
          </svg>
          Leads to a service already reached (a cycle or a second path)
        </span>
      </p>
    </div>
  )
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
