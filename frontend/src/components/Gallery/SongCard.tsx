import { Link } from 'react-router-dom'
import type { Song } from '../../types'

interface SongCardProps {
  song: Song
  showAuthor?: boolean
}

export function SongCard({ song, showAuthor = true }: SongCardProps) {
  const formattedDate = new Date(song.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })

  return (
    <Link
      to={`/view/${song.id}`}
      className="block p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:border-amber-500/30 hover:bg-slate-800/70 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-200 truncate group-hover:text-amber-300 transition-colors">
            {song.title}
          </h3>
          {showAuthor && song.user && (
            <p className="text-sm text-slate-500 mt-0.5">
              par {song.user.username}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          {song.audioPath && (
            <span className="flex items-center gap-1" title="Audio disponible">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 12V4.5" />
              </svg>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="font-mono">{song.tempo}</span> BPM
        </span>
        <span className="font-mono">{song.timeSignature}</span>
        <span className="ml-auto">{formattedDate}</span>
      </div>
    </Link>
  )
}
