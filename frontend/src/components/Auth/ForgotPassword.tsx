import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/api/auth/forgot-password', { email }, { skipAuth: true })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Oups, un truc a foiré')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-3">Check tes mails</h1>
          <p className="text-slate-400 text-sm mb-6">
            Si un compte existe avec cet email, tu recevras un lien pour changer ton mot de passe.
          </p>
          <Link
            to="/login"
            className="text-amber-400 hover:text-amber-300 text-sm"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Mot de passe oublié ?</h1>
          <p className="text-slate-400 text-sm">
            Entre ton email, on t'envoie un lien
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Ton email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500/50 transition-colors"
              placeholder="celui que tu as mis à l'inscription"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all"
          >
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="text-center mt-6 space-y-2">
          <Link
            to="/login"
            className="block text-slate-500 hover:text-slate-300 text-sm"
          >
            Je me souviens en fait
          </Link>
          <p className="text-xs text-slate-600">
            Pas d'email sur ton compte ? Malheureusement c'est perdu...
          </p>
        </div>
      </div>
    </div>
  )
}
