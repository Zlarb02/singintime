import { memo, useState, useRef, useEffect } from 'react'
import { SyllableCell } from './SyllableCell'
import type { Measure, Syllable, NoteDuration, TimeSignature } from '../../types'
import { getBeatsPerMeasure, getMeasureTotalBeats, isMeasureComplete } from '../../types'

interface MeasureRowProps {
  measure: Measure
  measureIndex: number
  measureCount: number
  effectiveTempo: number
  effectiveTimeSignature: TimeSignature
  selectedSyllableId: string | null
  currentDuration: NoteDuration
  measureStartTimeMs: number
  isPlaying: boolean
  hasClipboard: boolean
  readOnly?: boolean
  onSelectSyllable: (id: string | null) => void
  onAddSyllable: (partial?: Partial<Syllable>) => void
  onUpdateSyllable: (syllableId: string, updates: Partial<Syllable>) => void
  onRemoveSyllable: (syllableId: string) => void
  onSetMeasureTempo: (tempo: number | undefined) => void
  onRemoveMeasure: () => void
  onPlayFromMeasure: () => void
  onStop: () => void
  // Measure manipulation
  onCopyMeasure: () => void
  onPasteMeasure: () => void
  onDuplicateMeasure: () => void
  onInsertMeasureBefore: () => void
  onInsertMeasureAfter: () => void
  onMoveMeasureUp: () => void
  onMoveMeasureDown: () => void
}

export const MeasureRow = memo(function MeasureRow({
  measure,
  measureIndex,
  measureCount,
  effectiveTempo,
  effectiveTimeSignature,
  selectedSyllableId,
  currentDuration,
  measureStartTimeMs: _measureStartTimeMs,
  isPlaying,
  hasClipboard,
  readOnly = false,
  onSelectSyllable,
  onAddSyllable,
  onUpdateSyllable,
  onRemoveSyllable,
  onSetMeasureTempo,
  onRemoveMeasure,
  onPlayFromMeasure,
  onStop,
  onCopyMeasure,
  onPasteMeasure,
  onDuplicateMeasure,
  onInsertMeasureBefore,
  onInsertMeasureAfter,
  onMoveMeasureUp,
  onMoveMeasureDown
}: MeasureRowProps) {
  const beatsPerMeasure = getBeatsPerMeasure(effectiveTimeSignature)
  const currentBeats = getMeasureTotalBeats(measure)
  const isComplete = isMeasureComplete(measure, effectiveTimeSignature)
  const remainingBeats = beatsPerMeasure - currentBeats

  // Base width per beat (in pixels)
  const baseWidth = 80

  // Dropdown menu state
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleAddSyllable = () => {
    onAddSyllable({ duration: currentDuration })
  }

  const canMoveUp = measureIndex > 0
  const canMoveDown = measureIndex < measureCount - 1

  return (
    <div className="group">
      {/* Measure header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[var(--color-text-faint)] w-16">
          Mesure {measureIndex + 1}
        </span>

        {/* Tempo override indicator */}
        {measure.tempo && (
          <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
            ♩={measure.tempo}
          </span>
        )}

        {/* Time signature override indicator */}
        {measure.timeSignature && (
          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
            {measure.timeSignature}
          </span>
        )}

        {/* Fill indicator */}
        <div className="flex-1 flex items-center gap-1">
          <div className="h-1 flex-1 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                isComplete
                  ? 'bg-green-500'
                  : currentBeats > beatsPerMeasure
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, (currentBeats / beatsPerMeasure) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-[var(--color-text-faint)] w-12 text-right">
            {currentBeats.toFixed(1)}/{beatsPerMeasure}
          </span>
        </div>

        {/* Measure actions (visible on hover) */}
        {!readOnly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {/* Move up/down buttons */}
            <button
              onClick={onMoveMeasureUp}
              disabled={!canMoveUp}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Monter la mesure"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={onMoveMeasureDown}
              disabled={!canMoveDown}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Descendre la mesure"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-[var(--color-border)]/50 mx-1" />

            {/* Quick actions: copy, paste, duplicate */}
            <button
              onClick={onCopyMeasure}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Copier la mesure"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={onPasteMeasure}
              disabled={!hasClipboard}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={hasClipboard ? "Coller après cette mesure" : "Rien à coller"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button
              onClick={onDuplicateMeasure}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Dupliquer la mesure"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-[var(--color-border)]/50 mx-1" />

            {/* More actions menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                title="Plus d'options"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden z-50 min-w-[180px]">
                  <button
                    onClick={() => { onInsertMeasureBefore(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                    </svg>
                    Insérer avant
                  </button>
                  <button
                    onClick={() => { onInsertMeasureAfter(); setShowMenu(false) }}
                    className="w-full px-3 py-2 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
                    </svg>
                    Insérer après
                  </button>
                  <div className="h-px bg-[var(--color-border)]/50 my-1" />
                  <button
                    onClick={() => {
                      const newTempo = measure.tempo ? undefined : effectiveTempo
                      onSetMeasureTempo(newTempo)
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {measure.tempo ? 'Tempo global' : 'Tempo personnalisé'}
                  </button>
                  {measureIndex > 0 && (
                    <>
                      <div className="h-px bg-[var(--color-border)]/50 my-1" />
                      <button
                        onClick={() => { onRemoveMeasure(); setShowMenu(false) }}
                        className="w-full px-3 py-2 text-sm text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Syllables container */}
      <div className="relative flex items-center gap-2 p-3 bg-[var(--color-bg-secondary)]/30 rounded-lg border border-[var(--color-border)]/30 min-h-[100px]">
        {/* Play/Stop button */}
        <button
          onClick={isPlaying ? onStop : onPlayFromMeasure}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors shrink-0 ${
            isPlaying
              ? 'bg-amber-500 text-white'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:bg-amber-500/20 hover:text-amber-500'
          }`}
          title={isPlaying ? 'Arrêter' : `Jouer depuis mesure ${measureIndex + 1}`}
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14.72a1 1 0 001.5.87l11-7.36a1 1 0 000-1.74l-11-7.36a1 1 0 00-1.5.87z" />
            </svg>
          )}
        </button>

        {/* Syllables */}
        <div className="flex items-center gap-1 pt-4 relative z-10">
          {measure.syllables.map((syllable) => (
            <SyllableCell
              key={syllable.id}
              syllable={syllable}
              isSelected={selectedSyllableId === syllable.id}
              onClick={() => onSelectSyllable(syllable.id)}
              onTextChange={(text) => onUpdateSyllable(syllable.id, { text, rest: text === '' })}
              onDurationChange={(duration) => onUpdateSyllable(syllable.id, { duration })}
              onToggleDotted={() => onUpdateSyllable(syllable.id, { dotted: !syllable.dotted })}
              onToggleTied={() => onUpdateSyllable(syllable.id, { tied: !syllable.tied })}
              onDelete={() => onRemoveSyllable(syllable.id)}
              baseWidth={baseWidth}
            />
          ))}

          {/* Add syllable button */}
          {remainingBeats > 0 && (
            <button
              onClick={handleAddSyllable}
              className="w-12 h-16 flex items-center justify-center border-2 border-dashed border-[var(--color-border)]/50 rounded-lg text-[var(--color-text-faint)] hover:border-amber-500/50 hover:text-amber-500 transition-colors"
              title="Ajouter une syllabe"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Empty state */}
        {measure.syllables.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
            Cliquer sur + pour ajouter des syllabes
          </div>
        )}
      </div>
    </div>
  )
})
