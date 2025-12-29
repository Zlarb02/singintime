import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { AuthResponse } from '../../types'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>('/api/auth/login', {
        username,
        password
      }, { skipAuth: true })

      login(response.token, response.user)
      navigate('/editor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oups, un truc a foiré')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Content de te revoir</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Ton pseudo</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="ton_pseudo"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm text-slate-400">Mot de passe</label>
              <Link
                to="/forgot-password"
                className="text-xs text-slate-500 hover:text-amber-400 transition-colors"
              >
                Oublié ?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
          >
            {loading ? 'Une seconde...' : 'Entrer'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Première fois ?{' '}
          <Link to="/register" className="text-amber-400 hover:text-amber-300">
            Crée ton espace
          </Link>
        </p>
      </div>
    </div>
  )
}
