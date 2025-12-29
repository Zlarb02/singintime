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
    <div className="flex-1 flex flex-col pb-16">
      {/* Header */}
      <div className="bg-[var(--color-bg-secondary)]/50 border-b border-[var(--color-border)]/50 px-4 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{song.title}</h1>
              {song.user && (
                <p className="text-[var(--color-text-muted)] text-sm mt-1">par {song.user.username}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
              <span className="font-mono">{defaultTempo} BPM</span>
              <span className="font-mono">{defaultTimeSignature}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Measure grid */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto">
          <MeasureGrid readOnly />
        </div>
      </div>
    </div>
  )
}
