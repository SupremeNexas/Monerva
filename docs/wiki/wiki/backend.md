# Backend Architecture & Routing
Last Updated: 2026-07-19

This document details the backend REST API, Express routers structure, and database connection.

---

## 💻 Server Core: `backend/server.ts`
The API server is initialized in `backend/server.ts`:
* Imports configuration, initializes Express middleware, and registers routes.
* Binds to Port `5002` (with fallback to `5000`).
* Enforces CORS verification rules to protect the API from unauthorized external origins.
* Configures global JSON parsing, URL encoding, and request logging.
* Mounts a global unhandled exception catcher returning `500 Internal Server Error`.

---

## 📂 Source Code Structure
* `backend/server.ts` — Main server script.
* `backend/src/db/prisma.ts` — Global Prisma client exporter.
* `backend/src/middleware/auth.ts` — Token parsing middleware verifying JWTs.
* `backend/src/routes/` — Endpoint routing controllers:
  - `auth.ts` — Password hashes, Google OAuth, session refreshes.
  - `expenses.ts` — Transaction CRUD, wallet balance modifications.
  - `categories.ts` — Category categorization CRUD.
  - `budgets.ts` — Budget caps and spend tracking.
  - `credit_cards.ts` — Cards limits and due calculations.
  - `bills.ts` — obligation timeline lists.
  - `goals.ts` — Milestone savings targets.
  - `subscriptions.ts` — Monthly burn calculations.
  - `groups.ts` — Cooperative split ledgers.
  - `analytics.ts` — Charts metrics.
  - `insights.ts` — Spending advice.
  - `ai.ts` — Vision scanners and coaches.

---

## 🗄️ Database Connector: Prisma Client
We use the Prisma ORM Client to interact with PostgreSQL:
* **Client initialization** (`backend/src/db/prisma.ts`):
  ```typescript
  import { PrismaClient } from '@prisma/client';
  export const prisma = new PrismaClient();
  ```
* **Precise Decimal Handling**: PostgreSQL stores monetary values in high-precision `Decimal` columns. Prisma represents these as `Prisma.Decimal` instances. To prevent JSON transmission failures, we cast decimal fields to native numbers before sending them to the client.

---

## 🛡️ Router Input Validation
Each route implements inputs checks utilizing `express-validator` middleware rules:
* Sanitizes strings (e.g. `trim()`).
* Verifies ISO-8601 timestamps.
* Checks minimum floating ranges (e.g. `isFloat({ min: 0.01 })`).
* Validates related categories or wallets exist before database insertion.

---

## 🔗 Related Resources
* Visit [[wiki/database]] for relational maps.
* Visit [[wiki/api-reference]] for endpoint lists.
* Visit [[wiki/authentication]] for auth verification guards.
