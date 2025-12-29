# Déploiement SingInTime

## 1. GitHub Actions Secrets

Dans **GitHub > Settings > Secrets and variables > Actions** :

### Secrets
| Name | Value |
|------|-------|
| `PORTAINER_WEBHOOK_URL` | *(URL du webhook Portainer, à récupérer après création du stack)* |

### Variables (onglet "Variables")
| Name | Value |
|------|-------|
| `USE_PORTAINER_WEBHOOK` | `true` |

---

## 2. Portainer Stack

### Stack Name
```
singintime
```

### Docker Compose (copier dans Portainer)
```yaml
services:
  frontend:
    image: ghcr.io/zlarb02/singintime/frontend:latest
    restart: unless-stopped
    networks:
      - traefik-public
    depends_on:
      - backend
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

### Environment Variables (dans Portainer)
| Name | Value |
|------|-------|
| `JWT_SECRET` | *(générer avec: `openssl rand -base64 32`)* |

---

## 3. DNS (O2Switch)

| Type | Nom | Valeur |
|------|-----|--------|
| A | sit | `IP_DU_VPS` |
| A | api.sit | `IP_DU_VPS` |

---

## 4. Après déploiement

### Créer le premier admin
```bash
# Se connecter au container backend
docker exec -it singintime-backend-1 sh

# Dans le container, créer un admin
# (d'abord créer un compte via l'UI, puis)
sqlite3 /app/prisma/data/singintime.db "UPDATE User SET isAdmin = 1 WHERE username = 'ton_pseudo';"
```

### Webhook auto-deploy
1. Dans Portainer > Stack singintime > Editor
2. Activer "Webhooks"
3. Copier l'URL
4. L'ajouter dans GitHub Secrets: `PORTAINER_WEBHOOK_URL`

---

## 5. URLs de production

- **Frontend**: https://sit.pogodev.com
- **API**: https://api.sit.pogodev.com
- **Health check**: https://api.sit.pogodev.com/api/health

---

## 6. Maintenance

### Vérifier les logs
```bash
docker logs singintime-backend-1 -f
docker logs singintime-frontend-1 -f
```

### Backup des données
```bash
# Depuis le VPS
docker cp singintime-backend-1:/app/prisma/data/singintime.db ./backup-singintime.db
docker cp singintime-backend-1:/app/uploads ./backup-uploads
```

### Cleanup storage (via admin ou CLI)
```bash
docker exec -it singintime-backend-1 npx tsx src/scripts/cleanupStorage.ts
```
