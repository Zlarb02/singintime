import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import { SongCard } from './SongCard'
import type { Song } from '../../types'

export function UserLibrary() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const fetchSongs = async () => {
      try {
        const data = await api.get<Song[]>('/api/songs')
        setSongs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Oups, ça a planté')
      } finally {
        setLoading(false)
      }
    }

    fetchSongs()
  }, [isAuthenticated, navigate])

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mes trucs</h1>
          <p className="text-slate-400">{songs.length} création{songs.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/editor"
          className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg transition-colors"
        >
          + Créer
        </Link>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-700/50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-slate-400">Tu n'as encore rien créé</p>
          <Link to="/editor" className="text-amber-400 hover:text-amber-300 text-sm mt-2 inline-block">
            Allez, lance-toi !
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {songs.map((song) => (
            <div key={song.id} className="relative group">
              <SongCard song={song} showAuthor={false} />
              <Link
                to={`/editor/${song.id}`}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 bg-slate-700/80 hover:bg-slate-600 p-2 rounded-lg transition-all"
                title="Modifier"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
