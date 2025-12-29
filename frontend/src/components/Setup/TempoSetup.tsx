import { useState, useEffect } from 'react'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioStore } from '../../stores/audioStore'
import { useMetronome } from '../../hooks/useMetronome'
import { TIME_SIGNATURES } from '../../types'

export function TempoSetup() {
  const {
    defaultTempo,
    setDefaultTempo,
    defaultTimeSignature,
    setDefaultTimeSignature
  } = useEditorStore()

  const { metronomeEnabled, toggleMetronome } = useAudioStore()

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState(0)
  const [tempoInputValue, setTempoInputValue] = useState(defaultTempo.toString())

  const beatsPerMeasure = parseInt(defaultTimeSignature.split('/')[0])

  const { start, stop } = useMetronome({
    beatsPerMeasure,
    onBeat: (beat) => setCurrentBeat(beat)
  })

  // Sync tempo input with store
  useEffect(() => {
    setTempoInputValue(defaultTempo.toString())
  }, [defaultTempo])

  const handlePlay = () => {
    if (isPlaying) {
      stop()
      setIsPlaying(false)
      setCurrentBeat(0)
    } else {
      start()
      setIsPlaying(true)
    }
  }

  // Stop when unmounting
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  // Restart if tempo/signature changes while playing
  useEffect(() => {
    if (isPlaying) {
      start()
    }
  }, [defaultTempo, defaultTimeSignature])

  const handleTempoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempoInputValue(e.target.value)
  }

  const handleTempoInputBlur = () => {
    const value = parseFloat(tempoInputValue)
    if (!isNaN(value) && value > 0) {
      setDefaultTempo(value)
    } else {
      setTempoInputValue(defaultTempo.toString())
    }
  }

  const handleTempoInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTempoInputBlur()
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setDefaultTempo(value)
  }

  return (
    <div className="space-y-6">
      {/* Tempo */}
      <div>
        <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
          Tempo
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={40}
            max={240}
            step={0.5}
            value={defaultTempo}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-[var(--color-bg-tertiary)] rounded-full appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempoInputValue}
              onChange={handleTempoInputChange}
              onBlur={handleTempoInputBlur}
              onKeyDown={handleTempoInputKeyDown}
              className="w-20 px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/50"
              placeholder="120.00"
            />
            <span className="text-sm text-[var(--color-text-muted)]">BPM</span>
          </div>
        </div>
        <p className="text-xs text-[var(--color-text-faint)] mt-1">
          Supporte les decimales (ex: 128.50)
        </p>
      </div>

      {/* Time Signature */}
      <div>
        <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
          Signature
        </label>
        <div className="flex flex-wrap gap-2">
          {TIME_SIGNATURES.map((sig) => (
            <button
              key={sig.value}
              onClick={() => setDefaultTimeSignature(sig.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                defaultTimeSignature === sig.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]/80'
              }`}
            >
              {sig.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metronome Test */}
      <div className="flex items-center gap-4 p-4 bg-[var(--color-bg-primary)] rounded-lg">
        <button
          onClick={handlePlay}
          className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
            isPlaying
              ? 'bg-amber-500 text-white'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-amber-500/20 hover:text-amber-500'
          }`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14.72a1 1 0 001.5.87l11-7.36a1 1 0 000-1.74l-11-7.36a1 1 0 00-1.5.87z" />
            </svg>
          )}
        </button>

        <div className="flex-1">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isPlaying ? 'Metronome en cours...' : 'Tester le metronome'}
          </p>
          {isPlaying && (
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: beatsPerMeasure }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentBeat
                      ? i === 0
                        ? 'bg-amber-500 scale-125'
                        : 'bg-amber-400 scale-110'
                      : 'bg-[var(--color-bg-tertiary)]'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Metronome sound toggle */}
        <button
          onClick={toggleMetronome}
          className={`p-2 rounded-lg transition-colors ${
            metronomeEnabled
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
          }`}
          title={metronomeEnabled ? 'Son active' : 'Son desactive'}
        >
          {metronomeEnabled ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
