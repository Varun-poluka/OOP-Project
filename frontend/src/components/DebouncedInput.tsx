import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'

type DebouncedInputProps = Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  /** The committed value (e.g. from the URL). */
  value: string
  /** Called 400 ms after typing stops, with what was typed. */
  onCommit: (value: string) => void
  delayMs?: number
}

/**
 * A text box that shows typing at once but reports it only after a pause, so a search does not
 * run on every key press. If `value` changes from outside (Back button, "Clear filters"), the
 * box shows the new value. Same pattern as the text box on My incidents.
 */
export function DebouncedInput({ value, onCommit, delayMs = 400, ...inputProps }: DebouncedInputProps) {
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), []) // cancel a pending commit on unmount

  // "Adjust state while rendering": when the committed value changes, show it in the box.
  const [seenValue, setSeenValue] = useState(value)
  if (value !== seenValue) {
    setSeenValue(value)
    if (text.trim() !== value) setText(value)
  }

  return (
    <Input
      {...inputProps}
      value={text}
      onChange={(event) => {
        const next = event.target.value
        setText(next)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onCommit(next), delayMs)
      }}
    />
  )
}
