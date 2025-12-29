import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import { SongCard } from './SongCard'
import type { Song } from '../../types'

export function PublicGallery() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const data = await api.get<Song[]>('/api/gallery', { skipAuth: true })
        setSongs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Oups, ça a planté')
      } finally {
        setLoading(false)
      }
    }

    fetchSongs()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Galerie</h1>
      <p className="text-slate-400 mb-8">Regarde ce que les autres ont créé</p>

      {songs.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <p className="text-slate-400">Personne n'a encore partagé</p>
          <p className="text-slate-500 text-sm mt-1">Sois le premier !</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {songs.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
