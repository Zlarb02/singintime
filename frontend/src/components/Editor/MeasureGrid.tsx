import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioStore } from '../../stores/audioStore'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { usePlaybackStore, updateActiveSyllable } from '../../stores/playbackStore'
import { MeasureRow } from './MeasureRow'
import { DurationPickerCompact } from './DurationPicker'
import type { NoteDuration } from '../../types'
import { DURATION_INFO, getBeatsPerMeasure } from '../../types'

interface MeasureGridProps {
  readOnly?: boolean
}

export function MeasureGrid({ readOnly = false }: MeasureGridProps) {
  const {
    measures,
    selectedSyllableId,
    currentDuration,
    defaultTempo,
    defaultTimeSignature,
    clipboardMeasure,
    setSelectedSyllable,
    setCurrentDuration,
    addMeasures,
    setMeasureCount,
    removeMeasure,
    setMeasureTempo,
    addSyllable,
    updateSyllable,
    removeSyllable,
    reorderSyllables,
    getMeasureEffectiveTempo,
    getMeasureEffectiveTimeSignature,
    // Measure manipulation
    copyMeasure,
    pasteMeasure,
    duplicateMeasure,
    insertMeasureBefore,
    insertMeasureAfter,
    moveMeasureUp,
    moveMeasureDown
  } = useEditorStore()

  const { duration: audioDuration, isPlaying, currentTime: storeTime } = useAudioStore()
  const { seek, play, stop } = useAudioPlayer()
  const setSyllablePositions = usePlaybackStore((s) => s.setSyllablePositions)
  const setPlaybackAnchor = usePlaybackStore((s) => s.setPlaybackAnchor)
  const setActiveSyllableId = usePlaybackStore((s) => s.setActiveSyllableId)

  const [showAddMenu, setShowAddMenu] = useState(false)

  // Refs for the high-performance playback loop
  const rafRef = useRef<number | null>(null)
  const anchorRef = useRef<{ storeTime: number; perfTime: number } | null>(null)
  const lastStoreTimeRef = useRef<number>(0)

  // Calculate suggested number of measures based on audio duration
  const suggestedMeasures = useMemo(() => {
    if (!audioDuration || audioDuration <= 0) return null

    const beatsPerMeasure = getBeatsPerMeasure(defaultTimeSignature)
    const secondsPerBeat = 60 / defaultTempo
    const totalBeats = audioDuration / secondsPerBeat
    const measuresNeeded = Math.ceil(totalBeats / beatsPerMeasure)

    return measuresNeeded
  }, [audioDuration, defaultTempo, defaultTimeSignature])

  // Pre-compute syllable positions and sync to playback store
  const measureStartTimes = useMemo(() => {
    const times: number[] = []
    const positions: Map<string, { startMs: number; endMs: number }> = new Map()
    let timeMs = 0

    for (const measure of measures) {
      times.push(timeMs)
      const tempo = getMeasureEffectiveTempo(measure)
      const timeSig = getMeasureEffectiveTimeSignature(measure)
      const msPerBeat = 60000 / tempo
      const beatsPerMeasure = getBeatsPerMeasure(timeSig)

      if (measure.syllables.length === 0) {
        // Empty measure: use full measure duration
        timeMs += beatsPerMeasure * msPerBeat
      } else {
        // Measure with syllables: calculate from syllable durations
        for (const syllable of measure.syllables) {
          const info = DURATION_INFO[syllable.duration]
          let beats = info.beats
          if (syllable.dotted) beats *= 1.5
          const durationMs = beats * msPerBeat

          positions.set(syllable.id, {
            startMs: timeMs,
            endMs: timeMs + durationMs
          })

          if (!syllable.tied) {
            timeMs += durationMs
          }
        }
      }
    }

    // Sync positions to playback store for direct access
    setSyllablePositions(positions)

    return times
  }, [measures, getMeasureEffectiveTempo, getMeasureEffectiveTimeSignature, setSyllablePositions])

  // High-performance playback loop - updates active syllable directly in store
  // Uses time anchoring: capture (storeTime, performance.now()) and extrapolate
  const SEEK_THRESHOLD = 0.3

  const runPlaybackLoop = useCallback(() => {
    const { isPlaying: stillPlaying, currentTime: currentStoreTime } = useAudioStore.getState()

    if (!stillPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const now = performance.now()

    // Detect seek or re-anchor needed
    const needsReanchor = !anchorRef.current ||
      Math.abs(currentStoreTime - lastStoreTimeRef.current) > SEEK_THRESHOLD

    if (needsReanchor) {
      anchorRef.current = {
        storeTime: currentStoreTime,
        perfTime: now
      }
    }

    lastStoreTimeRef.current = currentStoreTime

    // Calculate precise time from anchor
    const anchor = anchorRef.current!
    const elapsedSec = (now - anchor.perfTime) / 1000
    const estimatedTime = anchor.storeTime + elapsedSec
    const estimatedTimeMs = estimatedTime * 1000

    // Update active syllable directly in store (no React state)
    updateActiveSyllable(estimatedTimeMs)

    // Continue loop
    rafRef.current = requestAnimationFrame(runPlaybackLoop)
  }, [])

  // Start/stop playback loop based on isPlaying
  useEffect(() => {
    if (isPlaying) {
      // Set initial anchor
      anchorRef.current = {
        storeTime: storeTime,
        perfTime: performance.now()
      }
      lastStoreTimeRef.current = storeTime
      setPlaybackAnchor(performance.now(), storeTime * 1000)

      // Start loop
      rafRef.current = requestAnimationFrame(runPlaybackLoop)
    } else {
      // Stop loop and clear active
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      anchorRef.current = null
      setActiveSyllableId(null)
      setPlaybackAnchor(null, 0)
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isPlaying, storeTime, runPlaybackLoop, setActiveSyllableId, setPlaybackAnchor])

  const handlePlayFromMeasure = (measureIndex: number) => {
    const startTimeMs = measureStartTimes[measureIndex] || 0
    seek(startTimeMs / 1000)
    play()
  }

  const handleSetMeasureCount = (count: number) => {
    const currentCount = measures.length
    if (count < currentCount) {
      // Check if we're deleting filled measures
      const measuresToDelete = measures.slice(count)
      const filledCount = measuresToDelete.filter(m => m.syllables.length > 0).length

      if (filledCount > 0) {
        const confirmed = window.confirm(
          `Attention: ${filledCount} mesure${filledCount > 1 ? 's' : ''} contenant des syllabes ${filledCount > 1 ? 'seront supprimées' : 'sera supprimée'}. Continuer?`
        )
        if (!confirmed) return
      }
    }
    setMeasureCount(count)
  }

  const handleAddMeasures = (count: number) => {
    addMeasures(count)
    setShowAddMenu(false)
  }

  // Find measure containing selected syllable
  const getSelectedMeasure = useCallback(() => {
    if (!selectedSyllableId) return null
    return measures.find(m => m.syllables.some(s => s.id === selectedSyllableId))
  }, [measures, selectedSyllableId])

  // Keyboard shortcuts for measure manipulation
  useEffect(() => {
    if (readOnly) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const measure = getSelectedMeasure()
      if (!measure) return

      // Ctrl/Cmd + C: Copy measure
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
        e.preventDefault()
        copyMeasure(measure.id)
      }
      // Ctrl/Cmd + V: Paste measure after current
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
        if (clipboardMeasure) {
          e.preventDefault()
          pasteMeasure(measure.id)
        }
      }
      // Ctrl/Cmd + D: Duplicate measure
      else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateMeasure(measure.id)
      }
      // Ctrl/Cmd + Shift + ArrowUp: Move measure up
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowUp') {
        e.preventDefault()
        moveMeasureUp(measure.id)
      }
      // Ctrl/Cmd + Shift + ArrowDown: Move measure down
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'ArrowDown') {
        e.preventDefault()
        moveMeasureDown(measure.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readOnly, getSelectedMeasure, copyMeasure, pasteMeasure, duplicateMeasure, moveMeasureUp, moveMeasureDown, clipboardMeasure])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar - fixed header, only show in edit mode */}
      {!readOnly && (
        <div className="shrink-0 bg-[var(--color-bg-primary)] px-4 pt-4 pb-2">
          <div className="max-w-5xl mx-auto flex items-center gap-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Durée:</span>
            <DurationPickerCompact
              value={currentDuration}
              onChange={setCurrentDuration}
            />

            <div className="flex-1" />

            {/* Suggested measures from audio */}
            {suggestedMeasures && suggestedMeasures !== measures.length && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {audioDuration && `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}`} → {suggestedMeasures} mesures
                </span>
                <button
                  onClick={() => handleSetMeasureCount(suggestedMeasures)}
                  className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors"
                >
                  Ajuster
                </button>
              </div>
            )}

            {/* Measure count */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)]">Mesures:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={measures.length}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  if (!isNaN(val) && val >= 1) {
                    handleSetMeasureCount(val)
                  }
                }}
                className="w-14 px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Quick duration buttons */}
            <div className="flex items-center gap-1">
              {(['quarter', 'eighth', 'sixteenth'] as NoteDuration[]).map((dur) => (
                <button
                  key={dur}
                  onClick={() => setCurrentDuration(dur)}
                  className={`
                    w-8 h-8 flex items-center justify-center rounded transition-colors
                    ${currentDuration === dur
                      ? 'bg-amber-500 text-white'
                      : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                    }
                  `}
                  title={DURATION_INFO[dur].name}
                >
                  {DURATION_INFO[dur].symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Measures - scrollable area */}
      <div className="flex-1 overflow-auto min-h-0">
        <div className="max-w-5xl mx-auto space-y-6 px-4 py-4">
        {measures.map((measure, index) => (
          <MeasureRow
            key={measure.id}
            measure={measure}
            measureIndex={index}
            measureCount={measures.length}
            effectiveTempo={getMeasureEffectiveTempo(measure)}
            effectiveTimeSignature={getMeasureEffectiveTimeSignature(measure)}
            selectedSyllableId={readOnly ? null : selectedSyllableId}
            currentDuration={currentDuration}
            measureStartTimeMs={measureStartTimes[index] || 0}
            isPlaying={isPlaying}
            hasClipboard={!!clipboardMeasure}
            readOnly={readOnly}
            onSelectSyllable={readOnly ? () => {} : setSelectedSyllable}
            onAddSyllable={readOnly ? () => {} : (partial) => addSyllable(measure.id, partial)}
            onUpdateSyllable={readOnly ? () => {} : (syllableId, updates) => updateSyllable(measure.id, syllableId, updates)}
            onRemoveSyllable={readOnly ? () => {} : (syllableId) => removeSyllable(measure.id, syllableId)}
            onReorderSyllables={readOnly ? () => {} : (fromIndex, toIndex) => reorderSyllables(measure.id, fromIndex, toIndex)}
            onSetMeasureTempo={readOnly ? () => {} : (tempo) => setMeasureTempo(measure.id, tempo)}
            onRemoveMeasure={readOnly ? () => {} : () => removeMeasure(measure.id)}
            onPlayFromMeasure={() => handlePlayFromMeasure(index)}
            onStop={stop}
            // Measure manipulation
            onCopyMeasure={() => copyMeasure(measure.id)}
            onPasteMeasure={() => pasteMeasure(measure.id)}
            onDuplicateMeasure={() => duplicateMeasure(measure.id)}
            onInsertMeasureBefore={() => insertMeasureBefore(measure.id)}
            onInsertMeasureAfter={() => insertMeasureAfter(measure.id)}
            onMoveMeasureUp={() => moveMeasureUp(measure.id)}
            onMoveMeasureDown={() => moveMeasureDown(measure.id)}
          />
        ))}

        {/* Add measure buttons - only show in edit mode */}
        {!readOnly && (
          <div className="relative">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddMeasures(1)}
                className="flex-1 py-3 border-2 border-dashed border-[var(--color-border)]/50 rounded-lg text-[var(--color-text-muted)] hover:border-amber-500/50 hover:text-amber-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                + 1 mesure
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="py-3 px-4 border-2 border-dashed border-[var(--color-border)]/50 rounded-lg text-[var(--color-text-muted)] hover:border-amber-500/50 hover:text-amber-500 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAddMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl overflow-hidden z-50">
                    {[2, 4, 8, 16, 32].map((count) => (
                      <button
                        key={count}
                        onClick={() => handleAddMeasures(count)}
                        className="w-full px-4 py-2 text-sm text-left text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        + {count} mesures
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help text - only show in edit mode */}
        {!readOnly && (
          <div className="text-center text-xs text-[var(--color-text-faint)] space-y-1 pb-4">
            <p>Double-clic sur une syllabe pour éditer | Glisser-déposer pour réordonner</p>
            <p className="opacity-70">
              <span className="font-mono">Ctrl+C</span> copier | <span className="font-mono">Ctrl+V</span> coller | <span className="font-mono">Ctrl+D</span> dupliquer | <span className="font-mono">Ctrl+Shift+↑↓</span> déplacer mesure
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
