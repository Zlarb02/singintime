import { useRef, useState, useCallback, useEffect } from 'react'
import { Howl } from 'howler'
import { useEditorStore } from '../../stores/editorStore'
import { useAudioStore } from '../../stores/audioStore'
import { useTempoDetection } from '../../hooks/useTempoDetection'
import { useMetronome } from '../../hooks/useMetronome'
import { TIME_SIGNATURES } from '../../types'

export function SetupWizard() {
  const {
    title,
    setTitle,
    audioFile,
    audioUrl,
    audioConfig,
    setAudioFile,
    setAudioOffset,
    defaultTempo,
    setDefaultTempo,
    defaultTimeSignature,
    setDefaultTimeSignature,
    isPublic,
    setIsPublic,
    copyrightAcknowledged,
    setCopyrightAcknowledged,
    setMode
  } = useEditorStore()

  const {
    isDetectingTempo,
    detectedTempo,
    metronomeEnabled,
    metronomeVolume,
    setMetronomeVolume,
    toggleMetronome
  } = useAudioStore()

  const { detectTempo } = useTempoDetection()
  const { start: startMetronome, stop: stopMetronome } = useMetronome({ beatsPerMeasure: 4 })

  const [isDragging, setIsDragging] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [tempoInputValue, setTempoInputValue] = useState(defaultTempo.toString())
  const [audioVolume, setAudioVolume] = useState(0.8)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const howlRef = useRef<Howl | null>(null)

  const offsetMs = audioConfig?.offsetMs ?? 0

  useEffect(() => {
    setTempoInputValue(defaultTempo.toString())
  }, [defaultTempo])

  useEffect(() => {
    if (audioUrl) {
      howlRef.current = new Howl({
        src: [audioUrl],
        html5: true,
        volume: audioVolume,
        onend: () => stopPlayback()
      })
    }
    return () => { howlRef.current?.unload() }
  }, [audioUrl])

  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(audioVolume)
  }, [audioVolume])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a)$/i))) {
      setAudioFile(file)
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
      const result = await detectTempo(file)
      if (result) {
        setDefaultTempo(result.bpm)
        setAudioOffset(result.offset)
      }
    }
  }

  const startPlayback = () => {
    if (howlRef.current) {
      howlRef.current.seek(Math.max(0, offsetMs / 1000))
      howlRef.current.play()
    }
    startMetronome()
    setIsPlaying(true)
  }

  const stopPlayback = () => {
    howlRef.current?.stop()
    stopMetronome()
    setIsPlaying(false)
  }

  const handleTempoBlur = () => {
    const value = parseFloat(tempoInputValue)
    if (!isNaN(value) && value > 0) {
      setDefaultTempo(value)
    } else {
      setTempoInputValue(defaultTempo.toString())
    }
  }

  const canStart = title.trim().length > 0 && (!isPublic || copyrightAcknowledged)

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Nouvelle chanson</h1>
          <p className="mt-2 text-lg text-[var(--color-text-muted)]">Importe ta musique pour commencer</p>
        </div>

        {!audioUrl ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-amber-500 bg-amber-500/10 scale-[1.02]'
                : 'border-[var(--color-border)] hover:border-amber-500/50 hover:bg-[var(--color-bg-secondary)]'
            }`}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-xl font-medium text-[var(--color-text-primary)] mb-2">Glisse ton fichier audio ici</p>
            <p className="text-base text-[var(--color-text-muted)]">MP3, WAV, OGG - Le tempo sera detecte automatiquement</p>
          </div>
        ) : (
          <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-[var(--color-text-primary)]">{audioFile?.name}</p>
                {isDetectingTempo && (
                  <p className="text-sm text-amber-500 flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    Detection du tempo...
                  </p>
                )}
                {detectedTempo && !isDetectingTempo && (
                  <p className="text-sm text-green-600 dark:text-green-400">Tempo detecte: {detectedTempo} BPM</p>
                )}
              </div>
              <button onClick={() => setAudioFile(null)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tempo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempoInputValue}
                    onChange={(e) => setTempoInputValue(e.target.value)}
                    onBlur={handleTempoBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTempoBlur()}
                    className="w-24 px-4 py-3 text-lg font-medium bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-base text-[var(--color-text-muted)]">BPM</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Signature</label>
                <select
                  value={defaultTimeSignature}
                  onChange={(e) => setDefaultTimeSignature(e.target.value as typeof defaultTimeSignature)}
                  className="px-4 py-3 text-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
                >
                  {TIME_SIGNATURES.map((sig) => (
                    <option key={sig.value} value={sig.value}>{sig.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Whiplash GIF - "Were you rushing or were you dragging?" - Centered & larger */}
            <div className="flex justify-center">
              <a
                href="https://www.youtube.com/watch?v=xDAsABdkWSc"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-80 hover:opacity-100 transition-opacity"
                title="Were you rushing or were you dragging?"
              >
                <img
                  src="https://y.yarn.co/8afd8aa4-b546-49a6-82cc-ab857f972f5e_text.gif"
                  alt="Whiplash - Were you rushing or were you dragging?"
                  className="h-24 rounded-xl shadow-lg"
                />
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Decalage <span className="font-normal text-[var(--color-text-muted)]">(si la musique ne demarre pas sur le temps 1)</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setAudioOffset(Math.max(0, offsetMs - 10))} className="px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]">-10</button>
                <input
                  type="number"
                  value={offsetMs}
                  onChange={(e) => setAudioOffset(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 px-4 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
                />
                <span className="text-base text-[var(--color-text-muted)]">ms</span>
                <button onClick={() => setAudioOffset(offsetMs + 10)} className="px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-tertiary)]">+10</button>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-bg-primary)] rounded-xl space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  className={`w-12 h-12 flex items-center justify-center rounded-full transition-colors ${isPlaying ? 'bg-amber-500 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-amber-500/20 hover:text-amber-500'}`}
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14.72a1 1 0 001.5.87l11-7.36a1 1 0 000-1.74l-11-7.36a1 1 0 00-1.5.87z" /></svg>
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-base font-medium text-[var(--color-text-primary)]">{isPlaying ? 'Ecoute...' : 'Tester la sync'}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Le clic doit etre en rythme</p>
                </div>
                <button onClick={toggleMetronome} className={`p-3 rounded-xl ${metronomeEnabled ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </button>
              </div>
              {/* Volume controls */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 flex-1">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                  </svg>
                  <input type="range" min="0" max="1" step="0.05" value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} className="flex-1 h-1.5 accent-amber-500" />
                  <span className="w-8 text-[var(--color-text-muted)]">{Math.round(audioVolume * 100)}%</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <input type="range" min="0" max="1" step="0.05" value={metronomeVolume} onChange={(e) => setMetronomeVolume(parseFloat(e.target.value))} className="flex-1 h-1.5 accent-amber-500" />
                  <span className="w-8 text-[var(--color-text-muted)]">{Math.round(metronomeVolume * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!audioUrl && <p className="text-center text-base text-[var(--color-text-muted)]">ou continue sans musique (mode acapella)</p>}

        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Titre de la chanson</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ma chanson"
              className="w-full px-4 py-3 text-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-amber-500"
            />
          </div>

          {!audioUrl && (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Tempo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempoInputValue}
                    onChange={(e) => setTempoInputValue(e.target.value)}
                    onBlur={handleTempoBlur}
                    onKeyDown={(e) => e.key === 'Enter' && handleTempoBlur()}
                    className="w-24 px-4 py-3 text-lg font-medium bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-center text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-base text-[var(--color-text-muted)]">BPM</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Signature</label>
                <select
                  value={defaultTimeSignature}
                  onChange={(e) => setDefaultTimeSignature(e.target.value as typeof defaultTimeSignature)}
                  className="px-4 py-3 text-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] focus:outline-none focus:border-amber-500"
                >
                  {TIME_SIGNATURES.map((sig) => (
                    <option key={sig.value} value={sig.value}>{sig.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded" />
            <span className="text-base text-[var(--color-text-primary)]">Publier dans la galerie</span>
          </label>

          {isPublic && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={copyrightAcknowledged} onChange={(e) => setCopyrightAcknowledged(e.target.checked)} className="w-5 h-5 mt-0.5 accent-amber-500 rounded" />
                <span className="text-base text-[var(--color-text-primary)]">Je confirme avoir les droits pour partager ce contenu</span>
              </label>
            </div>
          )}
        </div>

        <button
          onClick={() => setMode('editor')}
          disabled={!canStart}
          className="w-full py-4 text-lg font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
        >
          Commencer a ecrire
        </button>
        </div>
      </div>
    </div>
  )
}
