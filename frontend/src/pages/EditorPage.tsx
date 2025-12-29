import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SetupWizard } from '../components/Setup'
import { MeasureGrid } from '../components/Editor/MeasureGrid'
import { useEditorStore } from '../stores/editorStore'
import { useAuthStore } from '../stores/authStore'
import { api } from '../api/client'
import { parseBeats, type Song, TIME_SIGNATURES } from '../types'

export function EditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const {
    mode,
    songId,
    title,
    measures,
    defaultTempo,
    defaultTimeSignature,
    isPublic,
    isDirty,
    audioFile,
    audioConfig,
    copyrightAcknowledged,
    setTitle,
    setDefaultTempo,
    setDefaultTimeSignature,
    setIsPublic,
    setIsDirty,
    loadSong,
    reset,
    getBeatsFromMeasures
  } = useEditorStore()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempoInput, setTempoInput] = useState(defaultTempo.toString())
  const [offsetInput, setOffsetInput] = useState((audioConfig?.offsetMs || 0).toString())
  const tempoInputRef = useRef<HTMLInputElement>(null)

  const { setAudioOffset } = useEditorStore()

  // Sync offset input when audioConfig changes
  useEffect(() => {
    setOffsetInput((audioConfig?.offsetMs || 0).toString())
  }, [audioConfig?.offsetMs])

  // Sync tempo input when defaultTempo changes externally
  useEffect(() => {
    // Only update if not currently focused (to avoid overwriting user input)
    if (document.activeElement !== tempoInputRef.current) {
      setTempoInput(defaultTempo.toString())
    }
  }, [defaultTempo])

  // Load existing song if ID provided
  useEffect(() => {
    if (id) {
      const fetchSong = async () => {
        try {
          const song = await api.get<Song>(`/api/songs/${id}`)
          loadSong({
            ...song,
            beats: parseBeats(song.beats)
          })
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement')
        }
      }
      fetchSong()
    } else {
      reset()
    }
  }, [id, loadSong, reset])

  const handleSave = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setSaving(true)
    setError('')

    try {
      const songData = {
        title,
        // v2 fields
        defaultTempo,
        defaultTimeSignature,
        measures,
        audioConfig,
        copyrightAcknowledged,
        // Legacy fields for backward compatibility
        tempo: defaultTempo,
        timeSignature: defaultTimeSignature,
        beats: getBeatsFromMeasures(),
        isPublic
      }

      let savedSong: Song

      if (songId) {
        savedSong = await api.put<Song>(`/api/songs/${songId}`, songData)
      } else {
        savedSong = await api.post<Song>('/api/songs', songData)
        navigate(`/editor/${savedSong.id}`, { replace: true })
      }

      // Upload audio if new file
      if (audioFile) {
        const formData = new FormData()
        formData.append('audio', audioFile)
        if (audioConfig?.offsetMs) {
          formData.append('offsetMs', audioConfig.offsetMs.toString())
        }
        await api.post(`/api/songs/${savedSong.id}/audio`, formData)
      }

      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [isAuthenticated, navigate, songId, title, defaultTempo, defaultTimeSignature, measures, isPublic, audioFile, audioConfig, copyrightAcknowledged, getBeatsFromMeasures, setIsDirty])

  const handleDelete = async () => {
    if (!songId) return
    if (!confirm('Supprimer cette chanson ?')) return

    try {
      await api.delete(`/api/songs/${songId}`)
      navigate('/my-songs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de suppression')
    }
  }

  // Show SetupWizard for new songs
  if (mode === 'setup' && !id) {
    return <SetupWizard />
  }

  return (
    <div className="flex-1 flex flex-col pb-16 min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="bg-[var(--color-bg-secondary)]/50 border-b border-[var(--color-border)]/50 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la chanson"
            className="bg-transparent text-lg font-medium text-[var(--color-text-primary)] focus:outline-none border-b border-transparent focus:border-amber-500 transition-colors flex-1 min-w-0"
          />

          {/* Tempo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              ref={tempoInputRef}
              type="text"
              value={tempoInput}
              onChange={(e) => {
                const val = e.target.value
                // Allow any input while typing (including partial decimals like "120.")
                if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                  setTempoInput(val)
                  // Apply value if it's a valid number
                  const num = parseFloat(val)
                  if (!isNaN(num) && num > 0) {
                    setDefaultTempo(num)
                  }
                }
              }}
              onBlur={() => {
                // On blur, ensure we have a valid number or revert
                const num = parseFloat(tempoInput)
                if (isNaN(num) || num <= 0) {
                  setTempoInput(defaultTempo.toString())
                } else {
                  // Round to 3 decimal places and update both
                  const rounded = Math.round(num * 1000) / 1000
                  setTempoInput(rounded.toString())
                  setDefaultTempo(rounded)
                }
              }}
              className="w-16 px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-amber-500/50"
            />
            <span className="text-xs text-[var(--color-text-muted)]">BPM</span>
          </div>

          {/* Time signature */}
          <select
            value={defaultTimeSignature}
            onChange={(e) => setDefaultTimeSignature(e.target.value as typeof defaultTimeSignature)}
            className="px-2 py-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-amber-500/50 shrink-0"
          >
            {TIME_SIGNATURES.map((sig) => (
              <option key={sig.value} value={sig.value}>
                {sig.label}
              </option>
            ))}
          </select>

          {/* Audio offset editor - only show when audio is present */}
          {audioConfig && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-[var(--color-text-muted)]">Offset:</span>
              <button
                onClick={() => setAudioOffset(Math.max(0, (audioConfig.offsetMs || 0) - 10))}
                className="px-1.5 py-0.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-amber-500/50 transition-colors text-xs"
                title="-10ms"
              >
                -10
              </button>
              <button
                onClick={() => setAudioOffset(Math.max(0, (audioConfig.offsetMs || 0) - 1))}
                className="w-5 h-5 flex items-center justify-center bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-amber-500/50 transition-colors text-xs"
                title="-1ms"
              >
                -
              </button>
              <input
                type="number"
                value={offsetInput}
                onChange={(e) => {
                  setOffsetInput(e.target.value)
                  const val = parseInt(e.target.value)
                  if (!isNaN(val) && val >= 0) {
                    setAudioOffset(val)
                  }
                }}
                onBlur={() => {
                  const val = parseInt(offsetInput)
                  if (isNaN(val) || val < 0) {
                    setOffsetInput((audioConfig.offsetMs || 0).toString())
                  }
                }}
                className="w-14 px-1 py-0.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-center text-[var(--color-text-primary)] text-xs font-mono focus:outline-none focus:border-amber-500/50"
              />
              <span className="text-xs text-[var(--color-text-muted)]">ms</span>
              <button
                onClick={() => setAudioOffset((audioConfig.offsetMs || 0) + 1)}
                className="w-5 h-5 flex items-center justify-center bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-amber-500/50 transition-colors text-xs"
                title="+1ms"
              >
                +
              </button>
              <button
                onClick={() => setAudioOffset((audioConfig.offsetMs || 0) + 10)}
                className="px-1.5 py-0.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-amber-500/50 transition-colors text-xs"
                title="+10ms"
              >
                +10
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <MeasureGrid />
      </div>

      {/* Bottom panel - actions only */}
      <div className="bg-[var(--color-bg-secondary)]/50 border-t border-[var(--color-border)]/50 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Actions */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <span className="text-sm text-[var(--color-text-secondary)]">Publier dans la galerie</span>
            </label>

            <div className="flex items-center gap-3">
              {songId && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  Supprimer
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
              >
                {saving ? 'Sauvegarde...' : isDirty ? 'Sauvegarder' : 'Sauvegardé'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
