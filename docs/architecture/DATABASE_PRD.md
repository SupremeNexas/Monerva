# Product Requirements Document: Database Layer

**Product:** Expense Tracker — AI-native personal finance platform
**Version:** 1.0
**Last Updated:** 2026-08-05
**Stack:** PostgreSQL 14+ · Prisma ORM 5.x · Node.js (Express)

---

## 1. Overview

This document specifies the requirements for the database layer of the Expense Tracker. The database is the system of record for all financial data: user accounts, transactions, budgets, goals, subscriptions, credit cards, group expenses, and enterprise-grade features (workspaces, automations, audit logs).

It defines **what** the data layer must store and guarantee — not the UI or API contract, which are covered in [APRD.md](APRD.md) and the API wiki.

---

## 2. Goals & Non-Goals

### Goals
- **G1. Financial integrity** — monetary values are stored exactly (12,2 decimal precision), never as floats.
- **G2. Tenant isolation** — every user sees only their own data; workspaces scope all queries.
- **G3. Auditability** — all mutations to core financial records are traceable via immutable audit logs.
- **G4. Referential integrity** — no orphaned records; cascade deletion for user-owned data.
- **G5. Extensibility** — schema supports the full product roadmap (multi-currency, bank sync, notifications) without breaking migrations.

### Non-Goals
- Real-time data ingestion or event sourcing.
- Distributed / sharded storage (single primary database).
- Storage of non-financial content (documents, images live in object storage / Cloudinary, not the DB).
- Soft-delete on every table (deletion is hard delete with an audit trail).

---

## 3. Data Domains

The schema models **22 entities** across 6 domains:

| Domain | Entities |
|---|---|
| **Identity & Auth** | `User`, `Settings` |
| **Multi-tenancy** | `Workspace`, `WorkspaceMember` |
| **Money & Accounts** | `Wallet`, `CreditCard`, `Currency`-aware fields |
| **Spending** | `Transaction`, `Category`, `Budget`, `Receipt` |
| **Recurring & Obligations** | `RecurringTransaction`, `Subscription`, `Bill`, `Goal`, `GoalContribution`, `Notification` |
| **Collaboration** | `Group`, `GroupExpense`, `GroupExpenseSplit`, `GroupSettlement` |
| **Enterprise** | `Automation`, `AuditLog` |

---

## 4. Core Entity Requirements

### 4.1 User & Settings
- `User` is the root identity. Unique `email`, nullable `passwordHash` (Google-only accounts), nullable unique `googleId`.
- `authProvider` ∈ `email | google`; `isVerified` gates authenticated flows.
- `Settings` has a 1:1 relation to `User` (created at registration, `onDelete: Cascade`).

### 4.2 Workspaces (Multi-tenancy)
- Every user must have at least one `PERSONAL` `Workspace` (auto-created on registration or on first scoped request).
- `WorkspaceMember` enforces `@@unique([workspaceId, userId])` and role ∈ `OWNER | ADMIN | EDITOR | VIEWER`.
- **Constraint:** financial data may only be created after a workspace exists — no orphan rows with `workspaceId = NULL` post-migration.

### 4.3 Money & Accounts
- All money columns are `Decimal(12, 2)` (`Wallet.balance`, `Transaction.amount`, `Budget.amount`, `Goal.targetAmount`, etc.).
- `Wallet.type` ∈ `CASH | BANK | CREDIT_CARD | UPI | OTHER`; each wallet carries a `currency` for multi-currency support.
- `CreditCard` tracks `limitAmount`, `totalDue`, `minimumDue`, `dueDate`, and optional billing cycle (`billingCycleStart`/`billingCycleEnd`).

### 4.4 Transactions
- `Transaction` requires `userId`, `workspaceId`, `title`, `amount`, `type` (`EXPENSE|INCOME`), `categoryId`, `walletId`, `date`.
- Supports tags (`String[]`), notes, location, and optional `receiptUrl` / `attachmentUrl` (pointers to object storage).
- `lastEditorId` records who last modified a record for traceability.
- **Every create/update/delete must:** (1) adjust the owning wallet's balance, and (2) write an `AuditLog` entry.

### 4.5 Budgets, Goals, Subscriptions, Bills, Recurring
- `Budget` is per-category + period (`WEEKLY|MONTHLY`) with a `startDate`/`endDate` window used for progress calc.
- `Goal` + `GoalContribution` supports milestone-based savings with a running `currentAmount`.
- `RecurringTransaction` tracks `frequency` + `nextDate` for the job scheduler.
- `Subscription` tracks `billingCycle` and `nextBillingDate` for renewal alerts.
- `Bill` tracks due dates and paid/unpaid status for reminders.

### 4.6 Group Collaboration
- `Group` → `GroupExpense` → `GroupExpenseSplit` models shared expenses; `GroupSettlement` records debts paid between members.
- Splits and settlements reference `User` with two named relations (`PaidGroupExpenses`, `SentSettlements` / `ReceivedSettlements`) — split-ownership relations must be preserved.

### 4.7 Enterprise
- `Automation`: rule-based triggers stored as `conditions` / `actions` JSON blobs, scoped to a `Workspace`, with an `isActive` flag.
- `AuditLog`: append-only record of `action`, `resource`, `previousValues`, `newValues` with a `workspaceId` for workspace-scoped auditing.

---

## 5. Security & Tenant-Isolation Requirements

| Requirement | Spec |
|---|---|
| **R1 — Query scoping** | Every ORM query on tenant data MUST filter by `workspaceId` (and `userId` for non-workspace rows). No endpoint may read without a membership check. |
| **R2 — Role enforcement** | Mutations require role ∈ `OWNER, ADMIN, EDITOR`; reads allow `VIEWER`. Enforced in middleware before DB access. |
| **R3 — Cascade vs. Restrict** | User deletion cascades to all owned rows (`onDelete: Cascade`). Cross-tenant references must never cascade across workspaces. |
| **R4 — Sensitive fields** | `passwordHash` never selected into API responses; tokens never persisted. |
| **R5 — Monetary precision** | All arithmetic on money uses `Decimal` (Prisma) — no float accumulation, especially for balances and aggregates. |

---

## 6. Functional Data Requirements (FR)

- **FR-1** Register/login persists user + settings + default categories atomically.
- **FR-2** First scoped request for a user without a workspace creates a `PERSONAL` workspace and migrates any orphaned (`workspaceId = NULL`) rows to it.
- **FR-3** Creating a transaction adjusts the wallet balance in the same request; a failure in either must roll back both.
- **FR-4** Deleting a transaction reverses its wallet balance effect and logs the audit entry.
- **FR-5** Budget progress = sum of EXPENSE transactions in the budget window, computed on read (no denormalized counter).
- **FR-6** `nextDate` of a `RecurringTransaction` advances by its `frequency` when the scheduler processes it.
- **FR-7** Group settlement balances are derivable from splits + settlements (no cached net position that can drift).
- **FR-8** Automations fire on `TRANSACTION_CREATED`, `BUDGET_OVERRUN`, `GOAL_COMPLETED` events; conditions/actions stored as JSON with schema versioning.

---

## 7. Data Integrity & Constraints

- **C1** Unique indexes: `User.email`, `User.googleId`, `Settings.userId`, `WorkspaceMember(workspaceId, userId)`.
- **C2** Check-valid enum values enforced at application layer via Prisma (no `ENUM` DB types — keeps migrations simple).
- **C3** All `DateTime` stored in UTC; timezone handled at the application layer.
- **C4** Monetary columns are non-negative where semantically required (limits, targets); negative only for balance deltas.
- **C5** Foreign keys disallow dangling references; cascade deletes verified for `User`, `Workspace`, `Category`, `Wallet`, `Goal`, `Group`.

---

## 8. Audit & Compliance

- **A1** Every transaction create/update/delete writes an `AuditLog` row capturing `previousValues` and `newValues`.
- **A2** Audit logs are append-only in the application — no update/delete API exists for them.
- **A3** Budget and workspace mutations should be audited for enterprise tenants (current gap — see §11).
- **A4** Audit retention policy TBD (default: keep indefinitely in dev; production needs a retention window).

---

## 9. Non-Functional Requirements

| Dimension | Requirement |
|---|---|
| **Performance** | List endpoints (transactions, budgets) must return < 300 ms at 10k rows per workspace. Indexes on `(workspaceId, date)`, `(workspaceId, categoryId)`. |
| **Reliability** | DB connection pool sized for Express concurrency; connection timeout + retry on startup. |
| **Migration safety** | `prisma db push` for dev; additive-only migrations preferred in shared environments. |
| **Backups** | `run_db.sh` cluster should have a documented backup/restore path (pg_dump) for the `expense_tracker` database. |
| **Local reproducibility** | DB startup is scripted via `run_db.sh start` (port 5433) — see [wiki](wiki/database.md). |

---

## 10. Migration & Versioning

- **M1** Schema is the single source of truth in `prisma/schema.prisma`; `npx prisma db push` syncs dev.
- **M2** For production, adopt Prisma Migrate (`prisma migrate dev/deploy`) with versioned migration files instead of `db push`.
- **M3** Seed (`prisma/seed.ts`) must be idempotent — running it twice produces no duplicate sample rows.
- **M4** Schema additions must be additive; destructive changes (drops, renames) go through a documented migration with a data backfill step.

---

## 11. Known Gaps & Open Questions

1. **Audit coverage** — transactions are audited; budgets, workspaces, and auth events are not. Decide scope for enterprise compliance.
2. **Soft-delete** — no `deletedAt` columns exist. Required if the roadmap adds "recover deleted transactions".
3. **Multi-currency consistency** — wallet holds a `currency` and amounts are converted at write time to base currency, but there's no `exchange_rate_snapshot` stored. A converted amount is not reproducible without the rate at time of write. Consider storing the rate.
4. **Notification persistence** — `Notification` rows are created but no delivery pipeline exists; confirm whether they represent sent or pending items.
5. **Enums as strings** — `type`, `role`, `frequency`, etc. are free strings. Consider a DB-level enum or a shared const list to prevent typos creeping into data.
6. **Index review** — analytics queries aggregate by category + date across a workspace; confirm composite indexes cover `analytics/by-category` and `budget-status` hot paths.
7. **Receipt/transaction link** — `Receipt.transactionId` is optional and unindexed; a high-volume receipt scan flow needs an index.

---

## 12. Acceptance Criteria

- [ ] A new user can register and immediately read/write transactions in their auto-created workspace (verified end-to-end).
- [ ] Creating an expense updates the wallet balance and writes an audit row atomically.
- [ ] No API response exposes `passwordHash`.
- [ ] `prisma db push` and `prisma db seed` run cleanly from a fresh clone (via `run_db.sh start`).
- [ ] A user cannot read or mutate another workspace's data (RBAC integration test).
- [ ] All money fields serialize with two-decimal precision in API responses.

---

## 13. References

- Schema source of truth: `backend/prisma/schema.prisma`
- Seeder: `backend/prisma/seed.ts`
- DB ops script: `run_db.sh`
- AI features & models: [APRD.md](APRD.md)
