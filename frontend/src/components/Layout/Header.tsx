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
          <a
            href="https://github.com/Zlarb02/singintime"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-[var(--color-text-faint)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Code source sur GitHub"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
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
