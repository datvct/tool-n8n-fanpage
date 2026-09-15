# Production Deployment

## Server requirements

- Linux server with Docker Engine and Docker Compose plugin.
- A domain/reverse proxy pointing to port `3000`.
- HTTPS is recommended because the login session cookie is secure in production.

## First deploy

```bash
git clone <repository-url> content-manager
cd content-manager
chmod +x setup.sh
./setup.sh
```

The script creates `.env` when it does not exist, generates database and application secrets, builds the Next.js image, starts PostgreSQL, and runs `prisma db push` before starting the app.

Before running it, change at least `NEXT_PUBLIC_APP_URL` in `.env` to the public HTTPS URL. Keep `DATABASE_URL` private; the production Compose file injects an internal Docker PostgreSQL URL into the app.

## Update

```bash
git pull
./setup.sh
```

The PostgreSQL volume is preserved across rebuilds. Do not run `docker compose -f docker-compose.prod.yml down -v` unless the database should be deleted.

## Logs and status

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f postgres
```

After the public domain is active, point n8n callbacks and publish webhooks to that domain instead of `localhost` or a temporary local tunnel.
