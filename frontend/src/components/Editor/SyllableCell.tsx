import { useState, useRef, useEffect, memo } from 'react'
import type { Syllable, NoteDuration } from '../../types'
import { DURATION_INFO, getSyllableDurationInBeats, doubleDuration, halveDuration } from '../../types'
import { usePlaybackStore } from '../../stores/playbackStore'

interface SyllableCellProps {
  syllable: Syllable
  isSelected: boolean
  onClick: () => void
  onTextChange: (text: string) => void
  onDurationChange: (duration: NoteDuration) => void
  onToggleDotted: () => void
  onToggleTied: () => void
  onDelete: () => void
  baseWidth: number  // Width for 1 beat
}

// Memoized component - only re-renders when its specific props change
export const SyllableCell = memo(function SyllableCell({
  syllable,
  isSelected,
  onClick,
  onTextChange,
  onDurationChange,
  onToggleDotted,
  onToggleTied,
  onDelete,
  baseWidth
}: SyllableCellProps) {
  // Subscribe directly to playback store - only re-render when THIS syllable's active state changes
  const isActive = usePlaybackStore((state) => state.activeSyllableId === syllable.id)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(syllable.text)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calculate width based on duration
  const durationBeats = getSyllableDurationInBeats(syllable)
  const width = Math.max(60, baseWidth * durationBeats)

  const durationInfo = DURATION_INFO[syllable.duration]

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditText(syllable.text)
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (editText !== syllable.text) {
      onTextChange(editText)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setEditText(syllable.text)
      setIsEditing(false)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (editText === '' && syllable.text === '') {
        onDelete()
      }
    }
  }

  return (
    <div
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      className={`
        relative flex flex-col items-center justify-center
        h-16 rounded-lg border-2 transition-all cursor-pointer
        ${isActive
          ? 'bg-amber-500/30 border-amber-500 shadow-lg shadow-amber-500/20'
          : isSelected
            ? 'bg-amber-500/10 border-amber-500/50'
            : 'bg-[var(--color-bg-tertiary)]/50 border-[var(--color-border)]/50 hover:border-[var(--color-border)]'
        }
        ${syllable.rest ? 'opacity-50' : ''}
        ${syllable.tied ? 'border-r-0 rounded-r-none' : ''}
      `}
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {/* Duration indicator */}
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-[var(--color-text-faint)]">
        {durationInfo.symbol}
        {syllable.dotted && <span className="ml-0.5">.</span>}
      </div>

      {/* Text content */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent text-center text-[var(--color-text-primary)] focus:outline-none px-1"
          placeholder="-"
        />
      ) : (
        <span
          className={`text-sm font-medium truncate px-2 ${
            syllable.rest
              ? 'text-[var(--color-text-faint)] italic'
              : syllable.accent === 'strong'
                ? 'text-amber-400 font-bold'
                : syllable.accent === 'ghost'
                  ? 'text-[var(--color-text-muted)] opacity-60'
                  : 'text-[var(--color-text-primary)]'
          }`}
        >
          {syllable.text || (syllable.rest ? '—' : '')}
        </span>
      )}

      {/* Tied indicator */}
      {syllable.tied && (
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 text-amber-500">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12 C 8 4, 16 4, 20 12" />
          </svg>
        </div>
      )}

      {/* Selected actions */}
      {isSelected && !isEditing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[var(--color-bg-secondary)] rounded-lg px-2 py-1 border border-[var(--color-border)] shadow-lg z-10">
          {/* Duration x2 / ÷2 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDurationChange(halveDuration(syllable.duration)) }}
            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] transition-colors"
            title="Diviser par 2 (plus court)"
          >
            ÷2
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDurationChange(doubleDuration(syllable.duration)) }}
            className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] transition-colors"
            title="Multiplier par 2 (plus long)"
          >
            ×2
          </button>

          <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />

          <button
            onClick={(e) => { e.stopPropagation(); onToggleDotted() }}
            className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
              syllable.dotted
                ? 'bg-amber-500/20 text-amber-400'
                : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
            }`}
            title="Pointée (+50%)"
          >
            .
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleTied() }}
            className={`w-6 h-6 flex items-center justify-center rounded text-xs transition-colors ${
              syllable.tied
                ? 'bg-amber-500/20 text-amber-400'
                : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
            }`}
            title="Liée"
          >
            ⌒
          </button>

          <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />

          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="w-6 h-6 flex items-center justify-center rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
            title="Supprimer"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
})
