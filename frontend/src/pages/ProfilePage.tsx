import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

interface ProfileData {
  id: string
  username: string
  email: string | null
  songCount: number
  createdAt: string
  storage: {
    used: number
    limit: number
    usedFormatted: string
    limitFormatted: string
    percentUsed: number
  }
  globalStorage: {
    used: number
    limit: number
    usedFormatted: string
    limitFormatted: string
    percentUsed: number
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Edit form states
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await api.get<ProfileData>('/api/profile')
      setProfile(data)
      setEditUsername(data.username)
      setEditEmail(data.email || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      setError('Le nom est requis')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const updated = await api.put<{ username: string; email: string | null }>('/api/profile', {
        username: editUsername.trim(),
        email: editEmail.trim() || null
      })

      setUser({ ...user!, username: updated.username })
      setProfile(prev => prev ? { ...prev, username: updated.username, email: updated.email } : null)
      setIsEditing(false)
      setSuccess('Profil mis à jour')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await api.put('/api/profile/password', {
        currentPassword,
        newPassword
      })
      setShowPasswordForm(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Mot de passe mis à jour')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      setError('Tape SUPPRIMER pour confirmer')
      return
    }

    setSaving(true)
    try {
      await api.delete('/api/profile')
      logout()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-400">{error || 'Profil introuvable'}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Mon compte</h1>
        <p className="text-[var(--color-text-muted)] mb-8">Gère ton profil et ton espace de stockage</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Storage Section */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Espace de stockage</h2>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Ton espace</span>
              <span>{profile.storage.usedFormatted} / {profile.storage.limitFormatted}</span>
            </div>
            <div className="h-3 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  profile.storage.percentUsed > 90 ? 'bg-red-500' :
                  profile.storage.percentUsed > 70 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${profile.storage.percentUsed}%` }}
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {profile.songCount} chanson{profile.songCount > 1 ? 's' : ''}
            </p>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--color-text-muted)]">Espace global de l'app</span>
              <span className="text-[var(--color-text-muted)]">{profile.globalStorage.usedFormatted} / {profile.globalStorage.limitFormatted}</span>
            </div>
            <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  profile.globalStorage.percentUsed > 90 ? 'bg-red-500' :
                  profile.globalStorage.percentUsed > 70 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${profile.globalStorage.percentUsed}%` }}
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-[var(--color-bg-tertiary)] rounded-lg text-sm text-[var(--color-text-muted)]">
            <p className="font-medium text-[var(--color-text-primary)] mb-1">A propos du stockage</p>
            <p>
              SingInTime est un projet perso, pas une startup. Je n'ai pas de stockage illimité
              et l'app n'a pas vocation à grandir ni devenir payante. Chaque utilisateur a 200 Mo
              pour stocker ses fichiers audio. Si tu n'as plus de place, supprime des chansons.
            </p>
          </div>
        </div>

        {/* Profile Info Section */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Informations</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-amber-500 hover:text-amber-400"
              >
                Modifier
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Nom</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Pour récupérer ton compte"
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditUsername(profile.username)
                    setEditEmail(profile.email || '')
                  }}
                  className="px-4 py-2 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="text-sm text-[var(--color-text-muted)]">Nom</span>
                <p className="font-medium">{profile.username}</p>
              </div>
              <div>
                <span className="text-sm text-[var(--color-text-muted)]">Email</span>
                <p className={profile.email ? 'font-medium' : 'text-[var(--color-text-muted)] italic'}>
                  {profile.email || 'Non renseigné'}
                </p>
              </div>
              <div>
                <span className="text-sm text-[var(--color-text-muted)]">Membre depuis</span>
                <p className="font-medium">
                  {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sécurité</h2>

          {showPasswordForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1">Confirmer</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Mise à jour...' : 'Changer'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false)
                    setCurrentPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                  }}
                  className="px-4 py-2 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="text-amber-500 hover:text-amber-400"
            >
              Changer le mot de passe
            </button>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Zone dangereuse</h2>

          {showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Cette action est irréversible. Toutes tes chansons et fichiers audio seront supprimés.
                Tape <span className="font-mono text-red-400">SUPPRIMER</span> pour confirmer.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 bg-[var(--color-bg-tertiary)] border border-red-500/50 rounded-lg focus:outline-none focus:border-red-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={saving || deleteConfirmText !== 'SUPPRIMER'}
                  className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                >
                  {saving ? 'Suppression...' : 'Supprimer définitivement'}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="px-4 py-2 bg-[var(--color-bg-tertiary)] rounded-lg hover:bg-[var(--color-border)]"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300"
            >
              Supprimer mon compte
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
