import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAudioStore } from '../../stores/audioStore'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioPlayer } from '../../hooks/useAudioPlayer'
import { useMetronome } from '../../hooks/useMetronome'
import { useFlowBeep } from '../../hooks/useFlowBeep'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Volume slider row component for cleaner UI
function VolumeRow({
  icon,
  label,
  enabled,
  onToggle,
  volume,
  onVolumeChange,
  color = 'amber'
}: {
  icon: React.ReactNode
  label: string
  enabled: boolean
  onToggle: () => void
  volume: number
  onVolumeChange: (v: number) => void
  color?: 'amber' | 'blue' | 'purple'
}) {
  const colorClasses = {
    amber: 'text-amber-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400'
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${
          enabled
            ? `bg-${color}-500/20 ${colorClasses[color]}`
            : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
        }`}
        title={enabled ? 'Désactiver' : 'Activer'}
      >
        {icon}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${enabled ? colorClasses[color] : 'text-[var(--color-text-muted)]'}`}>
            {label}
          </span>
          <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
            {Math.round(volume * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className={`w-full h-1.5 accent-${color}-500 ${!enabled && 'opacity-50'}`}
          disabled={!enabled}
        />
      </div>
    </div>
  )
}

export function GlobalTransportBar() {
  const location = useLocation()
  const {
    isPlaying,
    currentTime,
    duration,
    metronomeEnabled,
    metronomeVolume,
    beepEnabled,
    beepVolume,
    setMetronomeVolume,
    toggleMetronome,
    setBeepVolume,
    toggleBeep
  } = useAudioStore()
  const { audioUrl, title, defaultTempo, mode } = useEditorStore()
  const { play, pause, stop, seek, isReady, setVolume } = useAudioPlayer()

  // Use syncToAudio mode when there's audio
  const { start: startMetronome, stop: stopMetronome } = useMetronome({ syncToAudio: !!audioUrl })
  const { start: startBeep, stop: stopBeep } = useFlowBeep({ syncToAudio: !!audioUrl })

  const [showVolumePopup, setShowVolumePopup] = useState(false)
  const [audioVolume, setAudioVolume] = useState(0.8)
  const wasPlayingRef = useRef(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Sync metronome and beep with playback state
  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      startMetronome()
      startBeep()
    } else if (!isPlaying && wasPlayingRef.current) {
      stopMetronome()
      stopBeep()
    }
    wasPlayingRef.current = isPlaying
  }, [isPlaying, startMetronome, stopMetronome, startBeep, stopBeep])

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowVolumePopup(false)
      }
    }
    if (showVolumePopup) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showVolumePopup])

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

  // Count active audio sources for indicator
  const activeCount = [audioUrl ? true : false, metronomeEnabled, beepEnabled].filter(Boolean).length

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
                {defaultTempo} BPM
              </p>
            </div>
          </div>
        </div>

        {/* Quick toggle buttons */}
        <div className="flex items-center gap-1">
          {/* Metronome quick toggle */}
          <button
            onClick={toggleMetronome}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              metronomeEnabled
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            title={metronomeEnabled ? 'Métronome ON' : 'Métronome OFF'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Flow beep quick toggle */}
          <button
            onClick={toggleBeep}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              beepEnabled
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            title={beepEnabled ? 'Flow preview ON' : 'Flow preview OFF'}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>

        {/* Volume controls popup */}
        <div className="relative" ref={popupRef}>
          <button
            onClick={() => setShowVolumePopup(!showVolumePopup)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative ${
              showVolumePopup
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
            }`}
            title="Mixer audio"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {/* Active sources indicator */}
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeCount}
            </span>
          </button>

          {/* Volume popup - redesigned */}
          {showVolumePopup && (
            <div className="absolute bottom-full right-0 mb-2 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-xl w-72">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                Mixer Audio
              </h3>

              <div className="space-y-4">
                {/* Music volume - only show when audio is loaded */}
                {audioUrl && (
                  <VolumeRow
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                      </svg>
                    }
                    label="Musique"
                    enabled={true}
                    onToggle={() => {}}
                    volume={audioVolume}
                    onVolumeChange={(v) => {
                      setAudioVolume(v)
                      setVolume?.(v)
                    }}
                    color="amber"
                  />
                )}

                {/* Metronome volume */}
                <VolumeRow
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  label="Métronome"
                  enabled={metronomeEnabled}
                  onToggle={toggleMetronome}
                  volume={metronomeVolume}
                  onVolumeChange={setMetronomeVolume}
                  color="blue"
                />

                {/* Flow beep volume */}
                <VolumeRow
                  icon={
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m-4 0h8m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  }
                  label="Flow Preview"
                  enabled={beepEnabled}
                  onToggle={toggleBeep}
                  volume={beepVolume}
                  onVolumeChange={setBeepVolume}
                  color="purple"
                />
              </div>

              {/* Help text */}
              <p className="mt-4 pt-3 border-t border-[var(--color-border)]/50 text-[10px] text-[var(--color-text-faint)] leading-relaxed">
                <span className="text-blue-400">Métronome</span> = clic sur chaque temps<br/>
                <span className="text-purple-400">Flow Preview</span> = bip sur chaque syllabe avec texte
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
