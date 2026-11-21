import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
  type TooltipContentProps,
} from 'recharts'
import type { Priority } from '@/api/types'
import { NO_DATA, type ComplianceBar, type CountBar, type PriorityBar, type WorkloadBar } from './reportCharts'

// The dashboard's charts, drawn with Recharts (React components that render SVG).
// The rules every chart here follows:
//  - one question per chart, asked by its title
//  - horizontal bars, so long labels (categories, names) stay readable
//  - the value is written at the end of every bar, so colour is never the only way to read it
//  - colours come from CSS variables (var(--p1) ...), so dark mode switches them automatically
//  - hovering a bar shows a tooltip with the exact numbers

/** Each priority's colour, the same variables PriorityBadge uses. */
const PRIORITY_FILL: Record<Priority, string> = {
  P1: 'var(--p1)',
  P2: 'var(--p2)',
  P3: 'var(--p3)',
  P4: 'var(--p4)',
}
const UNCLASSIFIED_FILL = 'var(--phase-closed)'

const ROW_HEIGHT = 30
const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 }
const VALUE_LABEL = { fill: 'var(--foreground)', fontSize: 12 }
/** Rounded only at the data end (right), square at the baseline. */
const BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0]
/**
 * Recharts 3 skips zero-width bars, and their value label with them, so a 0 % or 0 row
 * showed nothing at all. It keeps every bar that has a custom shape. This "custom" shape is
 * Recharts' own default (Rectangle draws nothing at width 0), so bars look the same but
 * the label ("0%", "No data", "0") is still written.
 */
const KEEP_ZERO_BARS = (props: BarShapeProps) => <Rectangle {...props} />

/** A card with the chart's question as its title, the chart, and a data table for screen readers and checking. */
export function ChartCard({
  title,
  subtitle,
  children,
  table,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  table: { headers: string[]; rows: (string | number)[][] }
}) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="font-medium">{title}</h2>
      {subtitle !== undefined && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      {/* aria-hidden: the SVG is a picture of the table below, which screen readers read instead. */}
      <div className="mt-3" aria-hidden>
        {children}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              {table.headers.map((header) => (
                <th key={header} scope="col" className="py-1 pr-3 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono tabular">
            {table.rows.map((row) => (
              <tr key={String(row[0])} className="border-t">
                {row.map((cell, index) => (
                  <td key={index} className="py-1 pr-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}

/** Tooltip box in the app's popover colours (Recharts' default is a white box, unreadable in dark mode). */
function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 font-mono tabular text-muted-foreground">
          {line}
        </p>
      ))}
    </div>
  )
}

/**
 * Recharts calls `content` with the hovered row in `payload[0].payload`.
 * This turns a "row -> text" function into such a content function.
 */
function tooltipFor<Row>(describe: (row: Row) => { title: string; lines: string[] }) {
  return function Content({ active, payload }: TooltipContentProps) {
    if (active !== true || payload === undefined || payload.length === 0) return null
    const row = payload[0].payload as Row
    return <TooltipBox {...describe(row)} />
  }
}

/** Height for n bars, so every chart uses the same bar thickness however many rows it has. */
function heightFor(rows: number, extra = 24): number {
  return Math.max(rows, 1) * ROW_HEIGHT + extra
}

/** One series of counts, e.g. incidents per status or per category. Single colour: the title names it. */
export function CountChart({ rows, labelWidth = 104 }: { rows: CountBar[]; labelWidth?: number }) {
  return (
    <ResponsiveContainer width="100%" height={heightFor(rows.length)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={labelWidth} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={tooltipFor<CountBar>((row) => ({ title: row.label, lines: [`${row.count} incidents`] }))}
        />
        <Bar dataKey="count" fill="var(--chart-1)" radius={BAR_RADIUS} isAnimationActive={false} shape={KEEP_ZERO_BARS}>
          <LabelList dataKey="count" position="right" style={VALUE_LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Counts per priority, each bar in its priority's colour (the label also names it, so colour is a bonus). */
export function PriorityCountChart({ rows }: { rows: PriorityBar[] }) {
  return (
    <ResponsiveContainer width="100%" height={heightFor(rows.length)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={104} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={tooltipFor<PriorityBar>((row) => ({ title: row.label, lines: [`${row.count} incidents`] }))}
        />
        <Bar dataKey="count" radius={BAR_RADIUS} isAnimationActive={false} shape={KEEP_ZERO_BARS}>
          {rows.map((row) => (
            <Cell key={row.key} fill={row.priority === null ? UNCLASSIFIED_FILL : PRIORITY_FILL[row.priority]} />
          ))}
          <LabelList dataKey="count" position="right" style={VALUE_LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

type ComplianceRow = ComplianceBar & { width: number; text: string }

/**
 * SLA compliance (0-100 %) per priority. "No data" rows get a zero-width bar and the words
 * "No data" where the value would be, so they can't be mistaken for 0 %.
 */
export function ComplianceChart({ rows }: { rows: ComplianceBar[] }) {
  const data: ComplianceRow[] = rows.map((row) => ({
    ...row,
    width: row.percent ?? 0,
    text: row.percent === null ? NO_DATA : `${row.percent}%`,
  }))
  return (
    <ResponsiveContainer width="100%" height={heightFor(data.length)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(value: number) => `${value}%`}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis type="category" dataKey="label" width={36} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={tooltipFor<ComplianceRow>((row) => ({
            title: row.priority,
            lines: [
              row.percent === null ? 'No data: no clock finished yet' : `${row.percent}% within the SLA`,
              `${row.incidents} incidents in range`,
            ],
          }))}
        />
        <Bar dataKey="width" radius={BAR_RADIUS} isAnimationActive={false} shape={KEEP_ZERO_BARS}>
          {data.map((row) => (
            <Cell key={row.priority} fill={PRIORITY_FILL[row.priority]} />
          ))}
          <LabelList dataKey="text" position="right" style={VALUE_LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Open vs resolved per technician: two series, so a legend plus a number on every bar. */
export function WorkloadChart({ rows }: { rows: WorkloadBar[] }) {
  const data = rows.map((row) => ({ ...row, label: row.available ? row.name : `${row.name} (away)` }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length, 1) * 52 + 48}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barGap={2}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={128} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)' }}
          content={tooltipFor<WorkloadBar>((row) => ({
            title: row.name,
            lines: [`${row.open} open`, `${row.resolved} resolved`, row.available ? 'Available' : 'Away'],
          }))}
        />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="square"
          formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        <Bar dataKey="open" name="Open" fill="var(--chart-1)" radius={BAR_RADIUS} isAnimationActive={false} shape={KEEP_ZERO_BARS}>
          <LabelList dataKey="open" position="right" style={VALUE_LABEL} />
        </Bar>
        <Bar dataKey="resolved" name="Resolved" fill="var(--chart-2)" radius={BAR_RADIUS} isAnimationActive={false} shape={KEEP_ZERO_BARS}>
          <LabelList dataKey="resolved" position="right" style={VALUE_LABEL} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
