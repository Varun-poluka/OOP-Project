import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/** Select items cannot have an empty value, so "no filter" is this sentinel. */
export const ALL = 'ALL'

type FilterSelectProps = {
  /** Width class for the trigger; the default suits short option labels. */
  className?: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  /** When set, adds a first "All …" option meaning "no filter". */
  allLabel?: string
  /** Shown while value is '' (nothing picked yet). */
  placeholder?: string
}

export function FilterSelect({ label, value, onChange, options, allLabel, placeholder = 'Choose…', className = 'w-44' }: FilterSelectProps) {
  return (
    <div className="space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn('h-9', className)} aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allLabel !== undefined && <SelectItem value={ALL}>{allLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
