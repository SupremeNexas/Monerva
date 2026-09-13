# 💸 Monerva

> A premium, AI-native personal finance platform. Track expenses, manage budgets, monitor recurring bills, analyse spending with AI-powered insights, and collaborate on shared group expenses — all in one production-ready application. 

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="MIT License" />
  <img src="https://img.shields.io/badge/version-1.0.0-orange" alt="Version" />
</p>
 
---

## 🌐 Live Demo

**[https://expense-tracker-eight-pi-69.vercel.app](https://expense-tracker-eight-pi-69.vercel.app)**

> Demo credentials: `demo@example.com` / `password123`

---

## ✨ Features

| Module | Description |
|---|---|
| **Dashboard** | Balance overview, recent transactions, spending sparklines, and budget progress |
| **Transactions** | Full CRUD with filters, tags, attachments, and receipt OCR via Gemini Vision |
| **Budgets** | Category-scoped monthly / weekly budget limits with live spend tracking |
| **Savings Goals** | Milestone-based savings with contribution tracking and progress bars |
| **Credit Cards** | Credit limit, due balance, minimum payment, and billing cycle management |
| **Recurring Bills** | Upcoming bill calendar with paid/unpaid status tracking |
| **Subscriptions** | Monthly/yearly subscription tracker with renewal date alerts |
| **Shared Groups** | Split expenses across members with settlement tracking and balance sheets |
| **AI Copilot** | Conversational finance coach powered by Gemini 2.5 Flash |
| **Analytics** | Category breakdown, trend charts, and spend-vs-income reports |
| **Workspace** | Multi-workspace support with role-based access control |
| **Auth** | Email/password + Google OAuth with JWT and silent refresh token rotation |

---

## 🏗️ Architecture

```
┌─────────────────────┐      HTTPS/REST       ┌─────────────────────────┐
│   Vite React SPA    │ ─────────────────────► │   Express API (Node.js) │
│   (port 5173)       │                        │   (port 5002)           │
│                     │ ◄───────────────────── │                         │
│  React 19           │      JSON responses    │  Prisma ORM             │
│  TailwindCSS v4     │                        │  JWT auth               │
│  TanStack Query     │                        │  express-validator      │
│  Zustand            │                        │  Gemini AI SDK          │
│  Framer Motion      │                        │                         │
│  Recharts           │                        └───────────┬─────────────┘
└─────────────────────┘                                    │
                                                           │ Prisma
                                                           ▼
                                              ┌────────────────────────┐
                                              │  PostgreSQL (port 5433) │
                                              │  16 relational models   │
                                              └────────────────────────┘
```

### Key Design Decisions

- **Decoupled SPA + API** — frontend and backend are independent and can be deployed separately (Vercel + Render/Railway)
- **Workspace scoping** — every API query is scoped by `userId` to prevent data leaks between accounts
- **Silent token refresh** — expired JWTs are transparently refreshed using a refresh token stored in `localStorage`, with no visible logout
- **AI fallback** — if `GEMINI_API_KEY` is not configured, the AI Copilot returns high-fidelity mock responses so the UI always works

---

## 📂 Project Structure

```
Monerva/
├── frontend/                   # Vite + React 19 SPA
│   ├── src/
│   │   ├── api/client.ts       # Typed fetch client with auth + workspace headers
│   │   ├── App.tsx             # Route definitions
│   │   ├── pages/              # 15 page components
│   │   ├── components/         # Shared UI (Layout, Modals, Charts, etc.)
│   │   ├── store/authStore.ts  # Zustand auth state + token management
│   │   └── types/index.ts      # Shared TypeScript interfaces
│   └── vite.config.ts
├── backend/                    # Express + TypeScript API
│   ├── server.ts               # Entry point (port 5002)
│   ├── prisma/
│   │   ├── schema.prisma       # 16-model relational schema
│   │   └── seed.ts             # Demo data seeder
│   └── src/
│       ├── routes/             # 15 route modules
│       ├── middleware/         # auth.ts, error.ts, rbac.ts, validation.ts
│       └── services/           # AI, automation, jobs, export, currency
├── wiki/                       # LLM-readable technical wiki (15 pages)
├── knowledge/                  # Obsidian knowledge vault
├── memory/                     # AI session state and priorities
├── CLAUDE.md                   # AI assistant operating guide
├── CODEX.md                    # Architecture and standards reference
└── AGENTS.md                   # AI behavioral specification
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+ (local or Docker)
- **Google OAuth credentials** (optional, for Google sign-in)
- **Gemini API key** (optional, for AI Copilot and receipt OCR)

---

### 1. Clone the repository

```bash
git clone https://github.com/SupremeNexas/Expense-Tracker.git
cd Expense-Tracker
```

---

### 2. Start PostgreSQL

The repo includes a helper script that manages a local PostgreSQL cluster on port `5433`:

```bash
./run_db.sh start
```

Alternatively, use Docker:

```bash
docker run -d \
  --name expense-tracker-db \
  -e POSTGRES_DB=expense_tracker \
  -e POSTGRES_USER=postgres \
  -p 5433:5432 \
  postgres:16
```

---

### 3. Configure and run the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, REFRESH_TOKEN_SECRET at minimum
npm install
npx prisma db push        # Create tables from schema
npx prisma db seed        # Seed demo user and sample data
npm start                 # Starts on http://localhost:5002
```

---

### 4. Configure and run the frontend

```bash
cd ../frontend
cp .env.example .env
# Edit .env — set VITE_API_URL=http://localhost:5002
npm install
npm run dev               # Starts on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) and sign in with:
- **Email:** `demo@example.com`
- **Password:** `password123`

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `PORT` | ✅ | API server port (default: `5002`) |
| `JWT_SECRET` | ✅ | Secret for signing access tokens |
| `REFRESH_TOKEN_SECRET` | ✅ | Secret for signing refresh tokens |
| `CLIENT_URL` | ✅ | Frontend origin for CORS (e.g. `http://localhost:5173`) |
| `GOOGLE_CLIENT_ID` | ⬜ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ⬜ | Google OAuth client secret |
| `GEMINI_API_KEY` | ⬜ | Gemini API key for AI Copilot and receipt OCR |
| `CLOUDINARY_CLOUD_NAME` | ⬜ | Cloudinary for receipt image uploads |
| `CLOUDINARY_API_KEY` | ⬜ | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ⬜ | Cloudinary API secret |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend API base URL (dev only; production uses Vite proxy) |
| `VITE_GOOGLE_CLIENT_ID` | ⬜ | Google OAuth client ID for Google Sign-In button |

---

## ☁️ Deployment

### Vercel (Frontend)

The frontend is pre-configured for Vercel with `frontend/vercel.json` that proxies `/api/*` requests to the deployed backend URL.

```bash
cd frontend
vercel --prod
```

Set these environment variables in the Vercel dashboard:
- `VITE_GOOGLE_CLIENT_ID` — your Google OAuth client ID

### Backend (Render / Railway)

Deploy `backend/` as a Node.js web service.

Required environment variables (set in your host dashboard):
- `DATABASE_URL` (use a managed PostgreSQL connection string)
- `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- `CLIENT_URL` (your Vercel production URL)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GEMINI_API_KEY`

### Google OAuth Configuration

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

**Authorised JavaScript Origins:**
```
http://localhost:5173
https://your-vercel-app.vercel.app
```

**Authorised Redirect URIs:**
```
http://localhost:5002/api/auth/google/callback
https://your-backend.onrender.com/api/auth/google/callback
```

---

## 🤖 AI Architecture

The AI layer uses **Gemini 2.5 Flash** via `@google/genai`:

| Feature | Endpoint | Description |
|---|---|---|
| **Receipt OCR** | `POST /api/ai/scan-receipt` | Multimodal vision — extracts merchant, items, total, and category from a receipt image |
| **AI Copilot** | `POST /api/ai/chat` | Context-loaded conversational coach with access to the user's spending data |
| **Insights** | `GET /api/insights` | Pre-computed spending anomalies and saving recommendations |

If `GEMINI_API_KEY` is not set, all AI endpoints return realistic mock data so the rest of the application continues to work.

---

## 🗄️ Database Schema

The Prisma schema defines **16 models** with full relational integrity:

`User` · `Settings` · `Workspace` · `WorkspaceMember` · `Wallet` · `CreditCard` · `Category` · `Transaction` · `Budget` · `Goal` · `GoalContribution` · `RecurringTransaction` · `Subscription` · `Receipt` · `Notification` · `Bill` · `Group` · `GroupExpense` · `GroupExpenseSplit` · `GroupSettlement` · `Automation` · `AuditLog`

All user-owned models are cascade-deleted when the user is removed. Every query in the API is scoped by `userId` for security.

---

## 🛠️ Development Commands

```bash
# Root
npm run setup            # Install all deps (backend + frontend)
npm run dev:backend      # Start backend dev server
npm run dev:frontend     # Start frontend dev server
npm run typecheck        # Type-check both workspaces

# Backend (from backend/)
npm start                # Start with tsx
npx prisma studio        # Open Prisma Studio (DB browser)
npx prisma db push       # Sync schema to DB
npx prisma db seed       # Re-seed demo data

# Frontend (from frontend/)
npm run dev              # Dev server on port 5173
npm run build            # Production build
npm run preview          # Preview production build
```

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Follow the [Conventional Commits](https://www.conventionalcommits.org/) format
4. Ensure `npm run typecheck` passes on both workspaces
5. Open a pull request against `main`

See [ROADMAP.md](ROADMAP.md) for planned features.

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for the full feature backlog.

Highlights:
- [ ] Mobile-responsive PWA with offline support
- [ ] Bank account import via Plaid / open banking APIs
- [ ] Multi-currency with live exchange rates
- [ ] Email digest and push notification delivery
- [ ] Team workspace with audit log and RBAC enforcement

---

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a full release history.

---

## 🔒 Security

Please report security vulnerabilities responsibly via [SECURITY.md](SECURITY.md).

---

## 📄 License

[MIT](LICENSE) — © 2025 SupremeNexas
