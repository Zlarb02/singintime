# SingInTime

Editeur de rythme pour paroles - Créez et synchronisez vos paroles sur la musique.

## Fonctionnalités

- **Editeur de mesures** : Créez des mesures avec des syllabes de durées variables (noires, croches, triolets, etc.)
- **Synchronisation audio** : Importez votre musique et synchronisez vos paroles
- **Métronome intégré** : Gardez le tempo avec le métronome configurable
- **Flow Preview** : Prévisualisez le rythme de vos paroles avec des bips sonores
- **Détection de tempo** : Détection automatique du BPM de votre musique
- **Partage** : Partagez vos créations en mode lecture seule

## Stack technique

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- Web Audio API (métronome, beeps)

### Backend
- Node.js + Express
- Prisma ORM
- SQLite
- JWT Authentication

### Déploiement
- Docker + Docker Compose
- GitHub Actions CI/CD
- Portainer

## Installation locale

### Prérequis
- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend
npm install
cp ../.env.example .env
# Modifier .env avec vos valeurs
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

L'application sera disponible sur http://localhost:3000

## Licence

MIT

## Auteur

[@Zlarb02](https://github.com/Zlarb02)
