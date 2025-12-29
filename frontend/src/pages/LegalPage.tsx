export function LegalPage() {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mentions légales</h1>

        <div className="space-y-8 text-[var(--color-text-secondary)]">
          {/* Éditeur */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Éditeur du site
            </h2>
            <p>
              SingInTime est un projet personnel non commercial, développé et hébergé par un particulier.
            </p>
            <p className="mt-2">
              <strong>Contact :</strong> 07 71 85 33 28 (SMS uniquement, pas d'appel)
            </p>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Hébergement
            </h2>
            <p>
              L'application est hébergée sur un serveur privé virtuel (VPS) en France.
            </p>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Données personnelles
            </h2>
            <p>Les données collectées sont :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nom d'utilisateur (obligatoire)</li>
              <li>Email (optionnel, pour récupération de compte)</li>
              <li>Mot de passe (chiffré)</li>
              <li>Contenus créés (paroles, fichiers audio uploadés)</li>
            </ul>
            <p className="mt-3">
              Ces données sont utilisées uniquement pour le fonctionnement de l'application.
              Elles ne sont ni vendues, ni partagées avec des tiers.
            </p>
            <p className="mt-2">
              Tu peux supprimer ton compte et toutes tes données à tout moment depuis la page "Mon compte".
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Cookies
            </h2>
            <p>
              L'application utilise uniquement le stockage local (localStorage) pour maintenir ta session.
              Aucun cookie tiers ni tracker n'est utilisé.
            </p>
          </section>

          {/* Contenus uploadés */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Contenus uploadés
            </h2>
            <p>
              Les utilisateurs sont seuls responsables des contenus qu'ils uploadent sur la plateforme.
              En uploadant un fichier audio, tu déclares avoir les droits nécessaires sur ce contenu
              ou l'utiliser dans un cadre privé/personnel.
            </p>
            <p className="mt-2">
              L'éditeur se réserve le droit de supprimer tout contenu signalé comme illicite.
            </p>
          </section>

          {/* Réclamations */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Réclamations
            </h2>
            <p>
              Pour toute réclamation concernant un contenu ou une demande de suppression de données,
              contacte-moi par SMS au <strong>07 71 85 33 28</strong>.
            </p>
            <p className="mt-2 text-[var(--color-text-muted)] text-sm">
              Merci de ne pas appeler, je réponds uniquement aux SMS.
            </p>
          </section>

          {/* Limitations */}
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Limitations de responsabilité
            </h2>
            <p>
              SingInTime est fourni "tel quel", sans garantie. L'éditeur ne peut être tenu responsable
              de la perte de données ou de l'indisponibilité du service.
            </p>
            <p className="mt-2">
              Ce projet n'a pas vocation à devenir commercial. L'espace de stockage est limité
              (200 Mo par utilisateur, 8 Go au total, soit 40 utilisateurs maximum).
            </p>
          </section>

          {/* Date */}
          <section className="pt-4 border-t border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
