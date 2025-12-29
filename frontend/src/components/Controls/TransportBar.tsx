import { useAudioStore } from '../../stores/audioStore'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { useEditorStore } from '../../stores/editorStore'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TransportBar() {
  const { isPlaying, currentTime, duration, metronomeEnabled, toggleMetronome } = useAudioStore()
  const { audioUrl } = useEditorStore()
  const { play, pause, stop, seek, isReady } = useAudioPlayer()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    seek(percent * duration)
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-[var(--color-bg-secondary)]/50 rounded-xl border border-[var(--color-border)]/50">
      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {/* Metronome toggle */}
        <button
          onClick={toggleMetronome}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            metronomeEnabled
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-[var(--color-bg-tertiary)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
          }`}
          title={metronomeEnabled ? 'Métronome activé' : 'Métronome désactivé'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button
          onClick={stop}
          disabled={!isReady}
          className="w-10 h-10 flex items-center justify-center bg-[var(--color-bg-tertiary)]/50 hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 rounded-lg transition-colors"
          title="Stop"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>

        <button
          onClick={isPlaying ? pause : play}
          disabled={!isReady}
          className="w-14 h-14 flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-full transition-colors shadow-lg shadow-amber-500/30"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5.14v14.72a1 1 0 001.5.87l11-7.36a1 1 0 000-1.74l-11-7.36a1 1 0 00-1.5.87z" />
            </svg>
          )}
        </button>

        <div className="w-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Mode indicator */}
      {!audioUrl && (
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Mode métronome (sans musique)
        </p>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-text-muted)] font-mono w-10 text-right">
          {formatTime(currentTime)}
        </span>

        <div
          className="flex-1 h-2 bg-[var(--color-bg-tertiary)] rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <span className="text-xs text-[var(--color-text-muted)] font-mono w-10">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
