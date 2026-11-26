# A1 MART

Retail operations app — Next.js frontend + Node/Express backend + MySQL.

```
frontend/   Next.js 15 (Chakra UI, AG Grid) — the UI
backend/    Express API, cron syncs (GoFrugal, Delium, Digisme), MySQL
```

## Where each setting lives

| Setting | File (local) | In production |
|---|---|---|
| Backend URL used by the UI | `frontend/.env.local` → `NEXT_PUBLIC_API_URL` | hosting env var `NEXT_PUBLIC_API_URL` (**set before building**) |
| Frontend URL allowed by the API (CORS) | `backend/.env` → `FRONTEND_URL` | server env var `FRONTEND_URL` |
| Database | `backend/.env` → `DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME` | same vars on the server |
| API keys (GoFrugal, Delium, Digisme, AWS S3) | `backend/.env` | same vars on the server |
| Login token keys | `backend/keys/jwt/private.key` + `public.key` | files on the server, or `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` |
| Backend port | `backend/.env` → `PORT` (default 8080) | `PORT` |

Templates: `frontend/.env.example`, `backend/.env.example`. Copy them, fill in
values, never commit the real files (they are git-ignored).

## Run locally

```bash
cd backend && cp .env.example .env    # fill in DB + keys
```

```bash
cd backend && npm install && npm run db:setup && npm start
```

```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Frontend: http://localhost:3000 · API: http://localhost:8080

`npm run db:setup` creates the database, runs all migrations and creates the
Super Admin (`ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`).

## Deploy

**MySQL** — use a managed MySQL 8 (e.g. AWS RDS / Lightsail DB, DigitalOcean
Managed MySQL, Railway MySQL) or MySQL on the same VPS as the backend. Put its
host/user/password/name in the backend env. Then run `npm run db:setup` once
from the backend to create tables. To move existing data:

```bash
mysqldump -u root -p Bus > a1mart.sql
```

```bash
mysql -h <db-host> -u <db-user> -p <db-name> < a1mart.sql
```

**Backend** — a long-running Node host (it runs cron jobs, so not serverless):
a VPS with PM2 (`backend/ecosystem.config.js`), Railway, or Render.

```bash
cd backend && npm ci && npm run db:setup && pm2 start ecosystem.config.js --env production
```

**Frontend** — Vercel (set root directory to `frontend`, add
`NEXT_PUBLIC_API_URL=https://<your-api>/`), or the existing
`frontend/deploy.sh` (PM2 on your server).

Then set `FRONTEND_URL=https://<your-frontend>` on the backend and restart it.

### Railway (step by step)

1. **MySQL** service (already created). Nothing else to do — tables are created
   by the backend on its first start.
2. **Backend**: New → GitHub repo `A1-Mart` → Settings → Root Directory
   `backend`. `backend/railway.json` makes it run `npm run start:railway`
   (database setup → server). Variables:
   ```text
   NODE_ENV=production
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=<choose a strong password>
   SEED_SAMPLE_DATA=true
   FRONTEND_URL=https://<frontend-domain>
   GOFRUGAL_API_KEY=…  DELIUM_API_KEY=…  DIGISME_API_KEY=…  DIGISME_CUSTOM_KEY=…
   AWS_ACCESS_KEY_ID=…  AWS_SECRET_ACCESS_KEY=…  AWS_S3_BUCKET=a1-stores-bucket
   JWT_PRIVATE_KEY=<contents of keys/jwt/private.key>
   JWT_PUBLIC_KEY=<contents of keys/jwt/public.key>
   ```
   Settings → Networking → **Generate Domain** to get the API URL.
3. **Frontend**: New → same repo → Root Directory `frontend`. Variable
   `NEXT_PUBLIC_API_URL=https://<backend-domain>/` (set it **before** the first
   build), then Generate Domain. Put that domain into the backend's
   `FRONTEND_URL` and redeploy the backend.

First start on an empty database: setup creates all tables + the admin user,
the syncs pull branches/employees (Digisme) and products/stock (GoFrugal,
read-only), and the sample data is added once that data exists (stock arrives
on the second product sync, so allow up to ~30–45 minutes). Watch the backend
logs for `[sample-data] Done`. Set `SEED_SAMPLE_DATA=false` before real use.

**Sample data (optional, demo only)** — `SEED_SAMPLE_DATA=true` on the backend
adds `[Sample]` records on start; see `frontend/docs/SAMPLE_DATA.md`. Keep it
`false` on a live database. GoFrugal is never written to.
