import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAudioStore } from '../../stores/audioStore'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { useMetronome } from '../../hooks/useMetronome'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function GlobalTransportBar() {
  const location = useLocation()
  const { isPlaying, currentTime, duration, metronomeEnabled, metronomeVolume, setMetronomeVolume, toggleMetronome } = useAudioStore()
  const { audioUrl, title, defaultTempo, mode } = useEditorStore()
  const { play, pause, stop, seek, isReady, setVolume } = useAudioPlayer()
  // Use syncToAudio mode when there's audio - keeps metronome locked to audio timeline
  const { start: startMetronome, stop: stopMetronome } = useMetronome({ syncToAudio: !!audioUrl })
  const [showVolumePopup, setShowVolumePopup] = useState(false)
  const [audioVolume, setAudioVolume] = useState(0.8)
  const wasPlayingRef = useRef(false)

  // Sync metronome with playback state (works with or without audio)
  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      startMetronome()
    } else if (!isPlaying && wasPlayingRef.current) {
      stopMetronome()
    }
    wasPlayingRef.current = isPlaying
  }, [isPlaying, startMetronome, stopMetronome])

  // Hide on setup wizard and non-editor pages
  const isEditorOrViewer = location.pathname.startsWith('/editor') || location.pathname.startsWith('/view')
  const isSetup = location.pathname.startsWith('/editor') && mode === 'setup'

  if (!isEditorOrViewer || isSetup) {
    return null
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    seek(percent * duration)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
      {/* Progress bar - clickable full width */}
      <div
        className="h-1 bg-[var(--color-bg-tertiary)] cursor-pointer group"
        onClick={handleSeek}
      >
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100 group-hover:h-1.5"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 px-4 py-2 max-w-5xl mx-auto">
        {/* Play/Pause */}
        <button
          onClick={isPlaying ? pause : play}
          disabled={!isReady}
          className="w-10 h-10 flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-full transition-colors shadow-lg shadow-amber-500/20"
          title={isPlaying ? 'Pause' : 'Play'}
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

        {/* Stop */}
        <button
          onClick={stop}
          disabled={!isReady}
          className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors"
          title="Stop"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        {/* Time display */}
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)]">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0 mx-4">
          <div className="flex items-center gap-3">
            {/* Audio indicator */}
            {audioUrl ? (
              <div className="w-8 h-8 flex-shrink-0 bg-amber-500/20 rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 flex-shrink-0 bg-[var(--color-bg-tertiary)] rounded flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm text-[var(--color-text-primary)] truncate font-medium">
                {title || 'Sans titre'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {defaultTempo} BPM {!audioUrl && '• Métronome'}
              </p>
            </div>
          </div>
        </div>

        {/* Volume controls */}
        <div className="relative">
          <button
            onClick={() => setShowVolumePopup(!showVolumePopup)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              showVolumePopup
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            title="Volume"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>

          {/* Volume popup */}
          {showVolumePopup && (
            <div className="absolute bottom-full right-0 mb-2 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-xl min-w-[200px]">
              {/* Audio volume */}
              {audioUrl && (
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value)
                      setAudioVolume(vol)
                      setVolume?.(vol)
                    }}
                    className="flex-1 h-1.5 accent-amber-500"
                  />
                  <span className="text-xs text-[var(--color-text-muted)] w-8">{Math.round(audioVolume * 100)}%</span>
                </div>
              )}

              {/* Metronome volume */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMetronome}
                  className={`w-4 h-4 shrink-0 ${metronomeEnabled ? 'text-amber-400' : 'text-[var(--color-text-muted)]'}`}
                  title={metronomeEnabled ? 'Désactiver' : 'Activer'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={metronomeVolume}
                  onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 accent-amber-500"
                  disabled={!metronomeEnabled}
                />
                <span className="text-xs text-[var(--color-text-muted)] w-8">{Math.round(metronomeVolume * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Metronome toggle */}
        <button
          onClick={toggleMetronome}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            metronomeEnabled
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
          title={metronomeEnabled ? 'Métronome activé' : 'Métronome désactivé'}
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
