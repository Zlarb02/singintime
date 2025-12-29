# Déploiement SingInTime

## Étape 1 : DNS (O2Switch)

Configurer les records DNS **en premier** (propagation ~5-10 min) :

| Type | Nom | Valeur |
|------|-----|--------|
| A | sit | `IP_DU_VPS` |
| A | api.sit | `IP_DU_VPS` |

---

## Étape 2 : GitHub (optionnel au début)

Dans **GitHub > Settings > Secrets and variables > Actions** :

### Variables (onglet "Variables")
| Name | Value |
|------|-------|
| `USE_PORTAINER_WEBHOOK` | `true` |

### Secrets
| Name | Value |
|------|-------|
| `PORTAINER_WEBHOOK_URL` | *(à ajouter APRÈS l'étape 4)* |

---

## Étape 3 : Créer le Stack Portainer

### 3.1 Stack Name
```
singintime
```

### 3.2 Environment Variables (en bas dans Portainer)
| Name | Value |
|------|-------|
| `JWT_SECRET` | *(générer avec: `openssl rand -base64 32`)* |

### 3.3 Docker Compose (copier-coller dans l'éditeur Portainer)

```yaml
services:
  frontend:
    image: ghcr.io/zlarb02/singintime/frontend:latest
    restart: unless-stopped
    networks:
      - traefik-public
    depends_on:
      - backend
    deploy:
      resources:
        limits:
          memory: 128M
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.singintime.rule=Host(`sit.pogodev.com`)"
      - "traefik.http.routers.singintime.entrypoints=websecure"
      - "traefik.http.routers.singintime.tls.certresolver=letsencrypt"
      - "traefik.http.services.singintime.loadbalancer.server.port=80"
      - "traefik.docker.network=traefik-public"

  backend:
    image: ghcr.io/zlarb02/singintime/backend:latest
    restart: unless-stopped
    networks:
      - traefik-public
    volumes:
      - singintime-data:/app/prisma/data
      - singintime-uploads:/app/uploads
    deploy:
      resources:
        limits:
          memory: 256M
    environment:
      - DATABASE_URL=file:./prisma/data/singintime.db
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3001
      - FRONTEND_URL=https://sit.pogodev.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.singintime-api.rule=Host(`api.sit.pogodev.com`)"
      - "traefik.http.routers.singintime-api.entrypoints=websecure"
      - "traefik.http.routers.singintime-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.singintime-api.loadbalancer.server.port=3001"
      - "traefik.docker.network=traefik-public"

networks:
  traefik-public:
    external: true

volumes:
  singintime-data:
  singintime-uploads:
```

### 3.4 Déployer
Cliquer sur "Deploy the stack"

---

## Étape 4 : Activer le Webhook (auto-deploy)

1. Dans Portainer > **Stacks** > singintime
2. Onglet **Editor**
3. Activer **"Webhooks"** (toggle en bas)
4. Copier l'URL générée
5. Aller dans GitHub > Settings > Secrets > Actions
6. Ajouter le secret `PORTAINER_WEBHOOK_URL` avec l'URL copiée

Maintenant chaque `git push` sur main redéploiera automatiquement.

---

## Étape 5 : Créer ton compte admin

```bash
# 1. Crée ton compte via l'UI : https://sit.pogodev.com/register

# 2. Sur le VPS, te rendre admin :
docker exec -it singintime-backend-1 sh -c "sqlite3 /app/prisma/data/singintime.db \"UPDATE User SET isAdmin = 1 WHERE username = 'ton_pseudo';\""
```

---

## URLs de production

- **Frontend** : https://sit.pogodev.com
- **API** : https://api.sit.pogodev.com
- **Health check** : https://api.sit.pogodev.com/api/health

---

## Maintenance

### Logs
```bash
docker logs singintime-backend-1 -f
docker logs singintime-frontend-1 -f
```

### Backup
```bash
docker cp singintime-backend-1:/app/prisma/data/singintime.db ./backup-singintime.db
docker cp singintime-backend-1:/app/uploads ./backup-uploads
```

### Cleanup storage
```bash
docker exec -it singintime-backend-1 npx tsx src/scripts/cleanupStorage.ts
```
