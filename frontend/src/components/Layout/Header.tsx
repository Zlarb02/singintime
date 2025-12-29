import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm border-b border-[var(--color-border)]/50 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <span className="text-lg font-light tracking-tight text-[var(--color-text-secondary)]">
            sing<span className="text-amber-500 font-medium">in</span>time
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />

          <Link
            to="/gallery"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-sm px-2 py-1.5"
          >
            galerie
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/my-songs"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-sm px-2 py-1.5 hidden sm:block"
              >
                mes trucs
              </Link>
              <Link
                to="/editor"
                className="text-amber-500 hover:text-amber-400 transition-colors text-sm px-2 py-1.5"
              >
                + nouveau
              </Link>
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[var(--color-border)]">
                {user?.isAdmin && (
                  <Link
                    to="/admin"
                    className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    title="Administration"
                  >
                    admin
                  </Link>
                )}
                <Link
                  to="/profile"
                  className="text-[var(--color-text-faint)] hover:text-amber-500 text-sm hidden sm:inline transition-colors"
                  title="Mon compte"
                >
                  {user?.username}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-text-secondary)] text-sm transition-colors"
                >
                  sortir
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-sm px-2 py-1.5"
              >
                entrer
              </Link>
              <Link
                to="/register"
                className="text-amber-500 hover:text-amber-400 transition-colors text-sm px-2 py-1.5"
              >
                rejoindre
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
