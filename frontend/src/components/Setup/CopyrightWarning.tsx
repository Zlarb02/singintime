interface CopyrightWarningProps {
  acknowledged: boolean
  onChange: (value: boolean) => void
}

export function CopyrightWarning({ acknowledged, onChange }: CopyrightWarningProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-[var(--color-text-primary)] mb-1">
          Droits d'auteur
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Tu souhaites partager ta création publiquement
        </p>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <div className="flex gap-3">
          <svg
            className="w-6 h-6 text-amber-500 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="space-y-2">
            <p className="text-sm text-[var(--color-text-primary)]">
              <strong>Important :</strong> Si tu utilises une musique protégée par le droit d'auteur,
              tu dois avoir les droits nécessaires pour la partager.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Les créations publiques peuvent être vues par tout le monde.
              Si tu n'es pas sûr, garde ta création en privé.
            </p>
          </div>
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 bg-[var(--color-bg-primary)] rounded-lg cursor-pointer hover:bg-[var(--color-bg-primary)]/80 transition-colors">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-[var(--color-border)] text-amber-500 focus:ring-amber-500/30 bg-[var(--color-bg-secondary)]"
        />
        <div>
          <p className="text-sm text-[var(--color-text-primary)]">
            Je confirme avoir les droits sur la musique utilisée
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Ou il s'agit d'une oeuvre libre de droits / domaine public
          </p>
        </div>
      </label>

      <div className="text-center">
        <p className="text-xs text-[var(--color-text-faint)]">
          Tu pourras toujours changer la visibilité plus tard
        </p>
      </div>
    </div>
  )
}
