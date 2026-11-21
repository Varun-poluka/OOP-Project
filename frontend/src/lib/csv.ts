// A small, pure CSV builder (RFC 4180: the common rules every spreadsheet understands).

export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

/** Cells that start like this are run as formulas by Excel and Sheets ("CSV injection"). */
const FORMULA_START = /^[=+\-@\t\r]/

/**
 * One cell as CSV text:
 *  - null/undefined become an empty cell
 *  - text that could start a formula gets a leading ' so the spreadsheet shows it as text
 *  - a cell containing a comma, quote or line break is wrapped in quotes, with quotes doubled
 *    (He said "hi" -> "He said ""hi""")
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/** A header line plus one line per row, joined with CRLF as RFC 4180 says. */
export function toCsv<T>(columns: CsvColumn<T>[], rows: readonly T[]): string {
  const lines = [columns.map((column) => escapeCsvCell(column.header)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(column.value(row))).join(','))
  }
  return lines.join('\r\n') + '\r\n'
}

/**
 * Makes the browser save `csv` as a file. Not pure (it touches the page), so it lives apart
 * from toCsv. The BOM (byte order mark, written \uFEFF) at the start tells Excel the file is UTF-8, so names like "Zoë" survive.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
