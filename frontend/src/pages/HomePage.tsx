import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function HomePage() {
  const { isAuthenticated } = useAuthStore()

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Hero - plus organique, moins marketing */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background décoratif subtil */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-orange-500 rounded-full blur-3xl" />
        </div>

        <div className="text-center max-w-xl relative z-10">
          {/* Logo/titre plus artisanal */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[var(--color-text-primary)] mb-2">
              sing<span className="text-amber-500 font-medium">in</span>time
            </h1>
            <div className="flex items-center justify-center gap-3 text-[var(--color-text-muted)]">
              <span className="w-8 h-px bg-[var(--color-border)]" />
              <span className="text-xs tracking-widest uppercase">écriture rythmique</span>
              <span className="w-8 h-px bg-[var(--color-border)]" />
            </div>
          </div>

          {/* Description plus poétique */}
          <p className="text-lg text-[var(--color-text-secondary)] mb-2 font-light">
            Pose tes mots sur le temps.
          </p>
          <p className="text-[var(--color-text-muted)] mb-10 text-sm max-w-sm mx-auto">
            Un petit outil pour écrire des paroles en rythme,
            synchroniser avec ta musique, et partager si t'en as envie.
          </p>

          {/* Boutons plus sobres */}
          <div className="flex flex-col items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/editor"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-amber-500/20"
              >
                Ouvrir l'éditeur
              </Link>
            ) : (
              <>
                <Link
                  to="/editor"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors shadow-lg shadow-amber-500/20"
                >
                  Essayer direct
                </Link>
                <p className="text-xs text-[var(--color-text-faint)]">
                  Pas de compte requis pour tester
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section "comment ça marche" - plus décontracté */}
      <div className="border-t border-[var(--color-border)]/50 bg-[var(--color-bg-secondary)]/30">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-2xl mb-2 text-[var(--color-text-faint)]">1</div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Tu remplis les cases,<br />une case = un temps
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2 text-[var(--color-text-faint)]">2</div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Tu importes ta musique<br />si t'en as une
              </p>
            </div>
            <div>
              <div className="text-2xl mb-2 text-[var(--color-text-faint)]">3</div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Tu lances et ça défile<br />façon karaoké
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lien galerie */}
      <div className="border-t border-[var(--color-border)]/50 py-8 text-center">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-amber-500 transition-colors"
        >
          <span>Voir les créations partagées</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>

      {/* Footer minimaliste */}
      <footer className="py-6 text-center border-t border-[var(--color-border)]/30">
        <p className="text-xs text-[var(--color-text-faint)]">
          gratuit & open source — pas de tracking
        </p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <a
            href="https://pogodev.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
          >
            pogodev.com
          </a>
          <span className="text-[var(--color-text-faint)]">·</span>
          <a
            href="https://pogodev.com/#contact"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
          >
            contact
          </a>
          <span className="text-[var(--color-text-faint)]">·</span>
          <Link
            to="/legal"
            className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)]"
          >
            mentions légales
          </Link>
        </div>
      </footer>
    </div>
  )
}
