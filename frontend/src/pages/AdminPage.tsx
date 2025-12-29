import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../stores/authStore'

interface AdminStats {
  users: { count: number; max: number }
  songs: number
  storage: {
    used: number
    usedFormatted: string
    limit: number
    limitFormatted: string
    percentUsed: number
    diskUsage: number
    diskUsageFormatted: string
  }
}

interface AdminUser {
  id: string
  username: string
  email: string | null
  isAdmin: boolean
  storageUsed: number
  storageLimit: number
  storageFormatted: string
  songCount: number
  createdAt: string
}

interface CleanupResult {
  orphanedFilesDeleted: number
  bytesFreed: number
  bytesFreedFormatted: string
  usersUpdated: number
  songsFixed: number
}

export function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [cleaning, setCleaning] = useState(false)

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/')
      return
    }
    fetchData()
  }, [user, navigate])

  const fetchData = async () => {
    try {
      const [statsData, usersData] = await Promise.all([
        api.get<AdminStats>('/api/admin/stats'),
        api.get<AdminUser[]>('/api/admin/users')
      ])
      setStats(statsData)
      setUsers(usersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Supprimer l'utilisateur "${username}" et toutes ses données ?`)) return

    try {
      await api.delete(`/api/admin/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      fetchData() // Refresh stats
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    try {
      await api.put(`/api/admin/users/${userId}`, { isAdmin: !currentIsAdmin })
      setUsers(users.map(u => u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Lancer le nettoyage du stockage ?')) return

    setCleaning(true)
    setCleanupResult(null)
    try {
      const result = await api.post<CleanupResult>('/api/admin/cleanup')
      setCleanupResult(result)
      fetchData() // Refresh stats
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setCleaning(false)
    }
  }

  if (!user?.isAdmin) {
    return null
  }

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
        <h1 className="text-2xl font-bold mb-2">Administration</h1>
        <p className="text-[var(--color-text-muted)] mb-8">Gestion de l'application</p>

        {/* Stats Dashboard */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="text-2xl font-bold">{stats.users.count}</div>
              <div className="text-sm text-[var(--color-text-muted)]">/ {stats.users.max} utilisateurs</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="text-2xl font-bold">{stats.songs}</div>
              <div className="text-sm text-[var(--color-text-muted)]">chansons</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="text-2xl font-bold">{stats.storage.usedFormatted}</div>
              <div className="text-sm text-[var(--color-text-muted)]">/ {stats.storage.limitFormatted}</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4">
              <div className="text-2xl font-bold">{stats.storage.diskUsageFormatted}</div>
              <div className="text-sm text-[var(--color-text-muted)]">sur disque</div>
            </div>
          </div>
        )}

        {/* Storage bar */}
        {stats && (
          <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4 mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span>Stockage global</span>
              <span>{stats.storage.percentUsed}%</span>
            </div>
            <div className="h-4 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stats.storage.percentUsed > 90 ? 'bg-red-500' :
                  stats.storage.percentUsed > 70 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${stats.storage.percentUsed}%` }}
              />
            </div>
          </div>
        )}

        {/* Cleanup */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-4 mb-8">
          <h2 className="font-semibold mb-3">Maintenance</h2>
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 disabled:opacity-50"
          >
            {cleaning ? 'Nettoyage...' : 'Nettoyer le stockage'}
          </button>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            Supprime les fichiers orphelins et recalcule l'espace utilisé
          </p>

          {cleanupResult && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-sm">
              <p>Fichiers orphelins supprimés : {cleanupResult.orphanedFilesDeleted}</p>
              <p>Espace libéré : {cleanupResult.bytesFreedFormatted}</p>
              <p>Utilisateurs mis à jour : {cleanupResult.usersUpdated}</p>
              <p>Chansons corrigées : {cleanupResult.songsFixed}</p>
            </div>
          )}
        </div>

        {/* Users list */}
        <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="font-semibold">Utilisateurs ({users.length})</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.username}</span>
                    {u.isAdmin && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs rounded">admin</span>
                    )}
                  </div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {u.songCount} chansons · {u.storageFormatted}
                  </div>
                  {u.email && (
                    <div className="text-xs text-[var(--color-text-faint)]">{u.email}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                    className="px-3 py-1 text-sm bg-[var(--color-bg-tertiary)] rounded hover:bg-[var(--color-border)]"
                  >
                    {u.isAdmin ? 'Retirer admin' : 'Rendre admin'}
                  </button>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id, u.username)}
                      className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
