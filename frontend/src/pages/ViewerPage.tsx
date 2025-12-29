import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MeasureGrid } from '../components/Editor/MeasureGrid'
import { useEditorStore } from '../stores/editorStore'
import { api } from '../api/client'
import { parseBeats, type Song } from '../types'

export function ViewerPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [song, setSong] = useState<Song | null>(null)

  const { loadSong, defaultTempo, defaultTimeSignature } = useEditorStore()

  useEffect(() => {
    const fetchSong = async () => {
      if (!id) return

      try {
        const data = await api.get<Song>(`/api/gallery/${id}`, { skipAuth: true })
        setSong(data)
        loadSong({
          ...data,
          beats: parseBeats(data.beats)
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chanson non trouvée')
      } finally {
        setLoading(false)
      }
    }

    fetchSong()
  }, [id, loadSong])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-[var(--color-text-muted)]">{error || 'Chanson non trouvée'}</p>
        <Link to="/gallery" className="text-amber-400 hover:text-amber-300">
          Retour à la galerie
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col pb-16 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)]/50 border-b border-[var(--color-border)]/50 px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-medium text-[var(--color-text-primary)] truncate">{song.title}</h1>
            {song.user && (
              <p className="text-[var(--color-text-muted)] text-sm">par {song.user.username}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)] shrink-0">
            <span className="font-mono">{defaultTempo} BPM</span>
            <span className="font-mono">{defaultTimeSignature}</span>
            <Link
              to="/gallery"
              className="px-3 py-1.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:border-amber-500/50 transition-colors"
            >
              Galerie
            </Link>
          </div>
        </div>
      </div>

      {/* Main content - same structure as EditorPage */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <MeasureGrid readOnly />
      </div>
    </div>
  )
}
