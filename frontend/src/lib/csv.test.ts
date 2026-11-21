import { describe, expect, it } from 'vitest'
import { escapeCsvCell, toCsv, type CsvColumn } from './csv'

describe('escapeCsvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(escapeCsvCell('VPN down')).toBe('VPN down')
    expect(escapeCsvCell(42)).toBe('42')
    expect(escapeCsvCell(true)).toBe('true')
  })

  it('turns null and undefined into an empty cell', () => {
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('quotes a cell with a comma', () => {
    expect(escapeCsvCell('Printer, floor 2')).toBe('"Printer, floor 2"')
  })

  it('doubles quotes inside a quoted cell', () => {
    expect(escapeCsvCell('He said "reboot"')).toBe('"He said ""reboot"""')
  })

  it('quotes a cell with a line break', () => {
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"')
    expect(escapeCsvCell('a\r\nb')).toBe('"a\r\nb"')
  })

  it.each(['=SUM(A1)', '+1', '-2', '@cmd'])('defuses a formula-looking text %j', (text) => {
    expect(escapeCsvCell(text)).toBe(`'${text}`)
  })

  it('does not touch negative numbers (only text can be a formula)', () => {
    expect(escapeCsvCell(-3)).toBe('-3')
  })

  it('defuses and quotes when both are needed', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
  })
})

describe('toCsv', () => {
  type Row = { id: string; title: string; tech: string | null }
  const columns: CsvColumn<Row>[] = [
    { header: 'ID', value: (r) => r.id },
    { header: 'Title', value: (r) => r.title },
    { header: 'Technician', value: (r) => r.tech },
  ]

  it('writes a header line and one CRLF-terminated line per row', () => {
    const csv = toCsv(columns, [
      { id: 'INC-1', title: 'VPN, slow', tech: null },
      { id: 'INC-2', title: 'Email', tech: 'Asha' },
    ])
    expect(csv).toBe('ID,Title,Technician\r\nINC-1,"VPN, slow",\r\nINC-2,Email,Asha\r\n')
  })

  it('is just the header when there are no rows', () => {
    expect(toCsv(columns, [])).toBe('ID,Title,Technician\r\n')
  })
})
