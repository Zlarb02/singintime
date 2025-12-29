import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/authStore'
import type { AuthResponse } from '../../types'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showEmail, setShowEmail] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post<AuthResponse>('/api/auth/register', {
        username,
        password,
        ...(email && { email })
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
          <h1 className="text-2xl font-bold mb-2">Crée ton espace</h1>
          <p className="text-slate-400 text-sm">
            Simple et rapide, promis
          </p>
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
              minLength={2}
              maxLength={20}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="comment on t'appelle ?"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="un truc que tu retiens"
            />
          </div>

          {/* Email optionnel */}
          {!showEmail ? (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              + Ajouter un email (optionnel)
            </button>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm text-slate-400">Email (optionnel)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
                placeholder="si tu veux pouvoir récupérer ton compte"
              />
              <p className="text-xs text-amber-500/80 leading-relaxed">
                L'email sert uniquement à récupérer ton mot de passe si tu l'oublies.
                On ne t'enverra jamais rien d'autre.
              </p>
            </div>
          )}

          {/* Avertissement clair */}
          {!email && (
            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-xl">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="text-amber-400">Sans email :</span> si tu oublies ton mot de passe,
                tu perds ton compte. C'est le deal, pas de données = pas de récupération possible.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
          >
            {loading ? 'Une seconde...' : 'C\'est parti'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Reviens par ici
          </Link>
        </p>
      </div>
    </div>
  )
}
