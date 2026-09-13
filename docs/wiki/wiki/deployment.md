# Deployment Guide
Last Updated: 2026-08-24

This document details the configuration for local PostgreSQL database setups and production hosting configurations (Supabase PostgreSQL, Render backend, Vercel frontend) for **Finova**.

---

## 🏗️ Local Database Startup (`run_db.sh`)
For local developer setups, database engines are containerized using a dedicated cluster:
* **Script**: `run_db.sh` runs commands to start/stop the local PostgreSQL database:
  - **Start**: Runs a PostgreSQL container mapped to Port `5433`, saving configurations in `postgres_data/`.
  - **Stop**: Halts the active PostgreSQL container.
* **Commands**:
  ```bash
  ./run_db.sh start
  ./run_db.sh stop
  ```

---

## 🌐 Production Architecture (Supabase + Render + Vercel)

```
                            ┌─────────────────────┐
                            │  Vercel Frontend    │
                            │  (finova.vercel.app) │
                            └──────────┬──────────┘
                                       │ (API Requests proxied)
                                       ▼ (/api/*)
                            ┌─────────────────────┐
                            │   Render Backend    │
                            │  (Express REST API) │
                            └──────────┬──────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼ (Pooled Target, Port 6543)         ▼ (Direct Target, Port 5432)
         ┌───────────────────────────┐         ┌───────────────────────────┐
         │     Supabase Postgres     │         │     Supabase Postgres     │
         │  (Runtime Transaction)    │         │  (CLI Push / Seeder Only) │
         └───────────────────────────┘         └───────────────────────────┘
```

The production deployment consists of three main parts:
1. **Database**: Managed PostgreSQL hosted on **Supabase** with connection pooling enabled.
2. **Backend**: Express REST API hosted on **Render** (monitored by blueprint `render.yaml`).
3. **Frontend**: Vite + React static single-page application hosted on **Vercel** with API endpoints proxied.

---

## 💾 1. Database Setup (Supabase)
To handle server scaling while utilizing Prisma ORM, we implement a split-connection approach:
1. **`DATABASE_URL` (Pooled Connection)**: Supabase Transaction Pooler (Port `6543`) with `?pgbouncer=true` if using PGBouncer, applied by the Express backend at runtime.
2. **`DIRECT_URL` (Direct Connection)**: Supabase Direct PostgreSQL database connection (Port `5432`), used by CLI migration tools (`npx prisma db push`, `db seed`).

### Syncing DB Schema
Run these locally to initialize the tables and seed default categories/scopes on your Supabase instance:
```bash
cd backend
DATABASE_URL="your-supabase-transaction-pooler-url" DIRECT_URL="your-supabase-direct-url" npx prisma db push
DATABASE_URL="your-supabase-transaction-pooler-url" DIRECT_URL="your-supabase-direct-url" npm run db:seed
```

---

## 🔌 2. Backend Service (Render)
Render builds the backend using the root-level configuration `render.yaml` configuration.

### Services Defined:
* **Type**: Web Service
* **Name**: `fintech-finova-backend`
* **Runtime**: Node
* **Build Command**: `cd backend && npm install && npx prisma generate && npx tsc`
* **Start Command**: `cd backend && npm run start`

### Production Environment Variables:
Configure the following variable values in the Render dashboard:
1. `DATABASE_URL`: Production Supabase Transaction Pooler connection string.
2. `DIRECT_URL`: Production Supabase Direct connection string.
3. `JWT_SECRET`: High-entropy string for signing JSON Web Tokens.
4. `CLIENT_URL`: Point to the Vercel frontend URL (to authorize CORS headers).
5. `GEMINI_API_KEY`: API key for AI Copilot receipt OCR and analysis.
6. `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Client keys for Google Sign-In verification.

---

## ⚡ 3. Frontend Service (Vercel)
Vercel hosts the compiled Vite / React application.

### Important Production Settings:
* **Root Directory**: Must be set to `frontend/` in the Vercel Dashboard Project Settings (required because it's a monorepo setup).
* **Framework Preset**: `Vite` (Vercel will auto-detect).
* **Build Command**: `npm run build` (outputs compilation to `dist/`).
* **API Proxy**: Frontend API calls utilize relative paths (`/api/*`). The routing rules are declared in `frontend/vercel.json` and proxy all `/api` traffic directly to Render:
  ```json
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://fintech-finova-backend.onrender.com/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

*Note: If Render has assigned a different URL to your backend (e.g. if the slot `fintech-finova-backend` was taken), you must update the Vercel rewrite destination in `frontend/vercel.json` to match the exact URL, then commit and push to GitHub.*

---

## 🔒 Production Security Checklist
- Ensure `NODE_ENV=production` is initialized in Render's environment.
- Rotate `JWT_SECRET` periodically.
- Configure HTTPS-only rules for cookie transactions when transmitting session items.
