import type { NoteDuration } from '../../types'
import { DURATION_INFO } from '../../types'

interface DurationPickerProps {
  value: NoteDuration
  onChange: (duration: NoteDuration) => void
}

const COMMON_DURATIONS: NoteDuration[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirtysecond'
]

const TRIPLET_DURATIONS: NoteDuration[] = [
  'triplet-half',
  'triplet-quarter',
  'triplet-eighth',
  'triplet-sixteenth'
]

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Common durations */}
      <div className="flex items-center gap-1">
        {COMMON_DURATIONS.map((duration) => {
          const info = DURATION_INFO[duration]
          return (
            <button
              key={duration}
              onClick={() => onChange(duration)}
              className={`
                flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors
                ${value === duration
                  ? 'bg-amber-500 text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/80'
                }
              `}
              title={`${info.name} - ${info.desc}`}
            >
              <span className="text-sm font-mono font-bold">{info.symbol}</span>
              <span className="text-[10px] opacity-70">{info.beats}t</span>
            </button>
          )
        })}
      </div>

      {/* Triplets */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--color-text-faint)] mr-2">Triolets</span>
        {TRIPLET_DURATIONS.map((duration) => {
          const info = DURATION_INFO[duration]
          return (
            <button
              key={duration}
              onClick={() => onChange(duration)}
              className={`
                flex items-center justify-center w-10 h-8 rounded-lg transition-colors text-sm font-mono font-bold
                ${value === duration
                  ? 'bg-amber-500 text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/80'
                }
              `}
              title={`${info.name} - ${info.desc}`}
            >
              {info.symbol}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Compact version for toolbar
export function DurationPickerCompact({ value, onChange }: DurationPickerProps) {
  const currentInfo = DURATION_INFO[value]
  const allDurations = [...COMMON_DURATIONS, ...TRIPLET_DURATIONS]

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-bg-tertiary)]/80 transition-colors"
      >
        <span className="font-mono font-bold">{currentInfo.symbol}</span>
        <span className="text-sm text-[var(--color-text-secondary)]">{currentInfo.name}</span>
        <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <div className="absolute top-full left-0 mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl p-2 hidden group-hover:block z-20 min-w-[280px]">
        {allDurations.map((duration) => {
          const info = DURATION_INFO[duration]
          const isTriplet = duration.startsWith('triplet')
          return (
            <button
              key={duration}
              onClick={() => onChange(duration)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
                ${value === duration
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }
                ${isTriplet ? 'pl-6' : ''}
              `}
            >
              <span className="w-8 text-center font-mono font-bold">{info.symbol}</span>
              <span className="flex-1">{info.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{info.beats}t</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
