import { useRef, useState, useCallback, useEffect } from 'react'
import { Howl } from 'howler'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioStore } from '../../stores/audioStore'
import { useTempoDetection } from '../../hooks/useTempoDetection'
import { useMetronome } from '../../hooks/useMetronome'

export function AudioSetup() {
  const {
    audioFile,
    audioUrl,
    audioConfig,
    setAudioFile,
    setAudioOffset,
    defaultTempo,
    setDefaultTempo
  } = useEditorStore()

  const {
    isDetectingTempo,
    detectedTempo,
    detectedOffset,
    metronomeEnabled,
    toggleMetronome
  } = useAudioStore()

  const { detectTempo } = useTempoDetection()
  const { start: startMetronome, stop: stopMetronome } = useMetronome({ beatsPerMeasure: 4 })

  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [tempoInputValue, setTempoInputValue] = useState(defaultTempo.toString())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const howlRef = useRef<Howl | null>(null)

  const offsetMs = audioConfig?.offsetMs ?? 0

  // Sync tempo input with store
  useEffect(() => {
    setTempoInputValue(defaultTempo.toString())
  }, [defaultTempo])

  // Initialize audio player
  useEffect(() => {
    if (audioUrl) {
      howlRef.current = new Howl({
        src: [audioUrl],
        html5: true,
        onload: () => {
          setDuration(howlRef.current?.duration() ?? 0)
        },
        onend: () => {
          stopPlayback()
        }
      })
    }

    return () => {
      howlRef.current?.unload()
    }
  }, [audioUrl])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i))) {
      setAudioFile(file)
      // Auto-detect tempo
      const result = await detectTempo(file)
      if (result) {
        setDefaultTempo(result.bpm)
        setAudioOffset(result.offset)
      }
    }
  }, [setAudioFile, detectTempo, setDefaultTempo, setAudioOffset])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAudioFile(file)
      // Auto-detect tempo
      const result = await detectTempo(file)
      if (result) {
        setDefaultTempo(result.bpm)
        setAudioOffset(result.offset)
      }
    }
  }

  const startPlayback = () => {
    if (!howlRef.current) return

    // Start audio at offset
    const startTime = Math.max(0, offsetMs / 1000)
    howlRef.current.seek(startTime)
    howlRef.current.play()
    setIsPlaying(true)

    // Start metronome using the centralized hook
    startMetronome()
  }

  const stopPlayback = () => {
    howlRef.current?.stop()
    stopMetronome()
    setIsPlaying(false)
  }

  const removeAudio = () => {
    stopPlayback()
    setAudioFile(null)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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

  const applyDetectedTempo = () => {
    if (detectedTempo) {
      setDefaultTempo(detectedTempo)
    }
    if (detectedOffset !== null) {
      setAudioOffset(detectedOffset)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-1">
          Audio
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Ajoute une musique pour synchroniser tes paroles (optionnel)
        </p>
      </div>

      {!audioUrl ? (
        // Upload zone
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-[var(--color-border)] hover:border-amber-500/50 hover:bg-amber-500/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <svg
            className="w-12 h-12 mx-auto mb-4 text-[var(--color-text-faint)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <p className="text-[var(--color-text-secondary)] mb-1">
            Glisser un fichier audio ici
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Le tempo sera detecte automatiquement (MP3, WAV, OGG)
          </p>
        </div>
      ) : (
        // Audio controls
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-primary)] rounded-lg">
            <div className="w-10 h-10 flex items-center justify-center bg-amber-500/20 rounded-lg">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text-primary)] truncate">
                {audioFile?.name || 'Fichier audio'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {duration > 0 && formatTime(duration)}
              </p>
            </div>
            <button
              onClick={removeAudio}
              className="p-2 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
              title="Supprimer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tempo detection result */}
          {isDetectingTempo && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-amber-400">Detection du tempo en cours...</span>
            </div>
          )}

          {detectedTempo && !isDetectingTempo && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">
                    Tempo detecte: <strong>{detectedTempo} BPM</strong>
                  </p>
                  {detectedOffset !== null && detectedOffset > 0 && (
                    <p className="text-xs text-green-400/70">
                      Decalage suggere: {detectedOffset} ms
                    </p>
                  )}
                </div>
                <button
                  onClick={applyDetectedTempo}
                  className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                >
                  Appliquer
                </button>
              </div>
            </div>
          )}

          {/* Tempo control */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              Tempo
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={tempoInputValue}
                onChange={handleTempoInputChange}
                onBlur={handleTempoInputBlur}
                onKeyDown={handleTempoInputKeyDown}
                className="w-24 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/50"
                placeholder="120.00"
              />
              <span className="text-sm text-[var(--color-text-muted)]">BPM</span>
            </div>
            <p className="text-xs text-[var(--color-text-faint)] mt-1">
              Supporte les decimales (ex: 128.50)
            </p>
          </div>

          {/* Offset control */}
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-2">
              Decalage debut
              <span className="text-[var(--color-text-muted)] ml-2">
                (si la musique ne demarre pas sur le temps 1)
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAudioOffset(Math.max(0, offsetMs - 10))}
                className="w-8 h-8 flex items-center justify-center bg-[var(--color-bg-tertiary)] rounded hover:bg-[var(--color-bg-tertiary)]/80 transition-colors text-sm"
              >
                -10
              </button>
              <input
                type="number"
                value={offsetMs}
                onChange={(e) => setAudioOffset(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-sm text-[var(--color-text-muted)]">ms</span>
              <button
                onClick={() => setAudioOffset(offsetMs + 10)}
                className="w-8 h-8 flex items-center justify-center bg-[var(--color-bg-tertiary)] rounded hover:bg-[var(--color-bg-tertiary)]/80 transition-colors text-sm"
              >
                +10
              </button>
            </div>
          </div>

          {/* Test sync */}
          <div className="p-4 bg-[var(--color-bg-primary)] rounded-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={isPlaying ? stopPlayback : startPlayback}
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
                  {isPlaying ? 'Ecoute avec metronome...' : 'Verifier la synchronisation'}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Le metronome doit etre en rythme avec la musique
                </p>
              </div>

              {/* Metronome toggle */}
              <button
                onClick={toggleMetronome}
                className={`p-2 rounded-lg transition-colors ${
                  metronomeEnabled
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                }`}
                title={metronomeEnabled ? 'Desactiver metronome' : 'Activer metronome'}
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
        </div>
      )}

      {/* No audio info */}
      {!audioUrl && (
        <p className="text-sm text-[var(--color-text-faint)] text-center">
          Tu peux aussi travailler sans musique (mode acapella)
        </p>
      )}
    </div>
  )
}
