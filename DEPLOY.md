# Déploiement SingInTime

## Étape 1 : DNS (O2Switch)

| Type | Nom | Valeur |
|------|-----|--------|
| A | sit | `IP_DU_VPS` |
| A | api.sit | `IP_DU_VPS` |

---

## Étape 2 : GitHub Secrets

Dans **GitHub > Settings > Secrets and variables > Actions > Secrets** :

| Name | Value |
|------|-------|
| `DOCKERHUB_USERNAME` | `etiennepogo` |
| `DOCKERHUB_TOKEN` | *(ton token Docker Hub)* |

---

## Étape 3 : Stack Portainer

### Stack Name
```
singintime
```

### Environment Variables (en bas dans Portainer)
| Name | Value |
|------|-------|
| `JWT_SECRET` | *(générer avec: `openssl rand -base64 32`)* |

### Docker Compose

```yaml
networks:
  web:
    name: traefik
    external: true

services:
  frontend:
    image: etiennepogo/singintime-frontend:latest
    container_name: singintime-frontend
    restart: unless-stopped
    depends_on:
      - backend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.singintime.rule=Host(`sit.pogodev.com`)"
      - "traefik.http.routers.singintime.entrypoints=websecure"
      - "traefik.http.routers.singintime.tls.certresolver=le"
      - "traefik.http.services.singintime.loadbalancer.server.port=80"
      - "traefik.docker.network=traefik"
    networks:
      - web

  backend:
    image: etiennepogo/singintime-backend:latest
    container_name: singintime-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=file:./data/singintime.db
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
      - FRONTEND_URL=https://sit.pogodev.com
    expose:
      - "3001"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.singintime-api.rule=Host(`api.sit.pogodev.com`)"
      - "traefik.http.routers.singintime-api.entrypoints=websecure"
      - "traefik.http.routers.singintime-api.tls.certresolver=le"
      - "traefik.http.services.singintime-api.loadbalancer.server.port=3001"
      - "traefik.docker.network=traefik"
    networks:
      - web
    volumes:
      - singintime-data:/app/prisma/data
      - singintime-uploads:/app/uploads

volumes:
  singintime-data:
  singintime-uploads:
```

---

## Étape 4 : Créer ton compte admin

```bash
# 1. Crée ton compte via l'UI : https://sit.pogodev.com/register

# 2. Sur le VPS, te rendre admin :
docker exec -it singintime-backend sh -c "sqlite3 /app/prisma/data/singintime.db \"UPDATE User SET isAdmin = 1 WHERE username = 'ton_pseudo';\""
```

---

## URLs de production

- **Frontend** : https://sit.pogodev.com
- **API** : https://api.sit.pogodev.com
- **Health check** : https://api.sit.pogodev.com/api/health

---

## Mise à jour

Après un push sur main :
1. GitHub Actions build et push les images sur Docker Hub
2. Dans Portainer > Stack singintime > cliquer **"Pull and redeploy"**

---

## Maintenance

### Logs
```bash
docker logs singintime-backend -f
docker logs singintime-frontend -f
```

### Backup
```bash
docker cp singintime-backend:/app/prisma/data/singintime.db ./backup-singintime.db
docker cp singintime-backend:/app/uploads ./backup-uploads
```

### Cleanup storage
```bash
docker exec -it singintime-backend npx tsx src/scripts/cleanupStorage.ts
```
