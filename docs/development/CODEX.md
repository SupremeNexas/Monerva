# CODEX.md

This document defines the technical rules, engineering guidelines, backend architectures, and database implementation standards for the **antigravity** project.

---

## 🏗️ Backend Architecture
The backend application is built using **Node.js**, **Express**, and **TypeScript**. It maps a set of router services directly to database delegates via the **Prisma Client**.
* The server listens on Port `5002` (remapped from `5000` to avoid macOS AirPlay port bindings conflict).
* Cors middleware is configured to only allow requests originating from verified origins (e.g. `http://localhost:5173`).
* Request parsing is restricted to standard JSON payloads and URL encoded bodies.

---

## 💻 Express Route Conventions
1. All route controllers reside inside `backend/src/routes/` and are mounted under `/api/` in the main `server.ts` server script.
2. Route definitions must protect user-space data using the `authenticate` middleware.
3. Every input payload must be validated using `express-validator` checks before execution.
4. Route files must export a default router.

---

## 🗄️ Database & Prisma Conventions
* **Engine**: PostgreSQL active on port `5433` (socket `/tmp`) using local trust authentication.
* **Prisma Schema**: Located at `backend/prisma/schema.prisma`.
* **Prisma Client**: Initialized globally in `backend/src/db/prisma.ts`.
* **Decimal Mappings**: All financial aggregates and amounts are represented using `@db.Decimal(12, 2)` or `@db.Decimal(10, 2)` inside PostgreSQL. To satisfy TypeScript Prisma models, these are instantiated as `Prisma.Decimal` instances inside routers, and converted to JavaScript `Number` types before returning to the frontend.
* **Relational Rules**: 
  - User records cascade delete Settings, Wallets, CreditCards, Transactions, Budgets, Goals, Subscriptions, Bills, and Groups.
  - Category deletions block cascading deletes if active transactions or budgets are dependent on them.

---

## 💻 TypeScript Standards
* Code must build cleanly with no warnings or errors under `strict: true` type configurations.
* Cast route parameter IDs (`req.params.id`) and query parameters (`req.query.*`) to `as string` before supplying them to Prisma filters to prevent array type warnings.
* Keep cast parameters explicit (avoid generic `any` types unless resolving dynamic Prisma inclusion fields).
* Export types from a central directory or define them clearly in `frontend/src/types/index.ts`.

---

## 🛡️ Validation Rules
* Every router must define a set of input validations using `express-validator`.
* Validations check for empty fields, proper floating-point range limits, valid ISO-8601 timestamps, and correct email layouts.
* A shared helper validation result inspector (`validate`) returns a standard `400 Bad Request` structure containing error arrays:
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "amount", "message": "Amount must be a positive number" }
    ]
  }
  ```

---

## 🔒 Security Practices
* **Passwords**: Encrypted using `bcryptjs` with a work load factor of `10` before insertion into the User model.
* **Access Tokens**: Short-lived JWT tokens (15 minutes lifespan) containing the verified payload `{ id, email }`. Verified via Bearer headers in middleware.
* **Refresh Tokens**: Long-lived refresh tokens (7 days lifespan) stored as a secure local storage key. Exchanged at `/api/auth/refresh` to rotate JWT tokens.
* **Google OAuth**: Verified using Google's official `google-auth-library` Client ID checks on the server-side payload, mapping retrieved emails/sub IDs directly to user records.

---

## ❌ Error Handling
* Wrap controller queries in standard `try-catch` structures.
* All catches must log error details to the server stdout and return a JSON format response:
  ```json
  { "error": "Internal server error details" }
  ```
* Standard error status codes must be returned:
  - `400`: Validation failed / missing parameters.
  - `401`: Unauthorized / missing token / invalid password.
  - `403`: Forbidden / scoping rules violated.
  - `404`: Entity not found.
  - `500`: System unhandled exception.

---

## 📊 Database Access Patterns (Scoping Rules)
> [!IMPORTANT]
> **Strict scoping**: Every single database transaction, search query, update, or deletion MUST scope results by `userId: req.user.id`.
> Do not query database models globally without this scope, as it will leak other users' private finance details.

Example:
```typescript
const budget = await prisma.budget.findFirst({
  where: {
    id: req.params.id as string,
    userId: req.user.id
  }
});
```

---

## 🧪 Testing Strategy
* Create simple REST test requests to verify controller endpoints.
* Database seed scripts located at `backend/prisma/seed.ts` run clean seed operations:
  ```bash
  npx prisma db seed
  ```
* Ensure demo accounts (`demo@example.com` / `password123`) can log in and populate charts before finalizing changes.

---

## 🚀 Deployment Checklist
1. Verify CORS headers include the target production URL in `server.ts`.
2. Ensure `DATABASE_URL` uses the correct PostgreSQL connection socket in production.
3. Validate that environment variables (`GOOGLE_CLIENT_ID`, `JWT_SECRET`) are mapped correctly in the host interface.
4. Run Vite client compile checks: `npm run build` inside `frontend/`.
5. Run Express compile checks: `npm run build` or TS compiler runs.

---

## 🌐 Environment Variables Rules
Every environment configuration must declare:
* **Backend (`backend/.env`)**:
  - `PORT` (Port to bind the express app, default: `5002`)
  - `DATABASE_URL` (PostgreSQL client connection string)
  - `JWT_SECRET` (Secure JWT hashing key)
  - `GOOGLE_CLIENT_ID` (Client ID for verified GSI)
  - `GOOGLE_CLIENT_SECRET` (OAuth client secret key)
  - `CLIENT_URL` (Frontend client URL for CORS checks)
  - `GEMINI_API_KEY` (Gemini API key for OCR scanning)
* **Frontend (`frontend/.env`)**:
  - `VITE_API_URL` (Backend API target URL, default: `http://localhost:5002`)
  - `VITE_GOOGLE_CLIENT_ID` (Google Sign-In button Client ID)

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for commands and structure.
* Read [[AGENTS.md]] for commit templates and workflows.
* Visit [[wiki/database]] for Prisma schemas.
