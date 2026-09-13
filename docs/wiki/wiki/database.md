# Database Schema & Models
Last Updated: 2026-07-19

This document details the PostgreSQL relational tables, column models, and onDelete cascades mapped via Prisma.

---

## 🗄️ Database Engine Configuration
* **Engine**: PostgreSQL v15+
* **Port**: `5433` (Local environment socket mapped via `run_db.sh`)
* **ORM**: Prisma Client v5+ (`backend/prisma/schema.prisma`)

---

## 📊 Database Models & Tables

### 1. User (`users` table)
Stores user accounts, credentials, and OAuth identifiers.
* `id` (String, UUID, Primary Key)
* `name` (String)
* `email` (String, Unique)
* `passwordHash` (String, Nullable for Google OAuth users)
* `baseCurrency` (String, default: `"USD"`)
* `googleId` (String, Unique, Nullable)
* `avatar` (String, Nullable image URL)
* `authProvider` (String, default: `"email"`)
* `isVerified` (Boolean, default: `false`)

### 2. Settings (`settings` table)
One-to-one configurations mapping preferences.
* `id` (String, UUID, Primary Key)
* `userId` (String, Unique, Foreign Key -> User, onDelete: Cascade)
* `theme` (String, default: `"light"`)
* `currency` (String, default: `"USD"`)
* `language` (String, default: `"en"`)
* `emailNotifications` (Boolean, default: `true`)
* `budgetAlerts` (Boolean, default: `true`)

### 3. Wallet (`wallets` table)
Financial assets sources (cash, bank accounts, UPI).
* `id` (String, UUID, Primary Key)
* `userId` (String, Foreign Key -> User, onDelete: Cascade)
* `name` (String)
* `type` (String: `CASH`, `BANK`, `CREDIT_CARD`, `UPI`, `OTHER`)
* `balance` (Decimal, default: `0.00`)
* `color` (String)

### 4. Category (`categories` table)
Hierarchical transaction filters.
* `id` (String, UUID, Primary Key)
* `userId` (String, Nullable: null represents system default categories)
* `name` (String)
* `color` (String)
* `icon` (String)
* `type` (String, default: `"EXPENSE"`: `EXPENSE`, `INCOME`)

### 5. Transaction (`transactions` table)
Financial operations logs.
* `id` (String, UUID, Primary Key)
* `userId` (String, Foreign Key -> User, onDelete: Cascade)
* `categoryId` (String, Foreign Key -> Category)
* `walletId` (String, Foreign Key -> Wallet, onDelete: Cascade)
* `title` (String)
* `amount` (Decimal)
* `type` (String, default: `"EXPENSE"`)
* `paymentMethod` (String, Nullable)
* `tags` (String Array)
* `notes` (String, Nullable)
* `date` (DateTime)
* `location` (String, Nullable)
* `attachmentUrl` (String, Nullable)
* `receiptUrl` (String, Nullable)
* `isRecurring` (Boolean, default: `false`)

### 6. Budget (`budgets` table)
Category spending thresholds.
* `id` (String, UUID, Primary Key)
* `userId` (String, Foreign Key -> User, onDelete: Cascade)
* `categoryId` (String, Foreign Key -> Category, onDelete: Cascade)
* `amount` (Decimal)
* `period` (String, default: `"MONTHLY"`)
* `startDate` (DateTime)
* `endDate` (DateTime)

### 7. Goal & GoalContribution (`goals`, `goal_contributions`)
Milestone savings targets.
* **Goal**: `id`, `userId` (FK -> User, Cascade), `name`, `targetAmount` (Decimal), `currentAmount` (Decimal), `targetDate` (DateTime, Nullable).
* **GoalContribution**: `id`, `goalId` (FK -> Goal, Cascade), `amount` (Decimal), `date` (DateTime), `notes` (Nullable).

### 8. RecurringTransaction (`recurring_transactions` table)
Schedules for automated expenses.
* `id`, `userId` (FK -> User, Cascade), `title`, `amount` (Decimal), `type` (default: `"EXPENSE"`), `categoryId` (FK -> Category), `walletId` (FK -> Wallet), `frequency` (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`), `startDate` (DateTime), `nextDate` (DateTime), `endDate` (DateTime, Nullable), `isActive` (Boolean, default: `true`).

### 9. Subscription & Bill (`subscriptions`, `bills`)
* **Subscription**: `id`, `userId` (FK -> User, Cascade), `name`, `amount` (Decimal), `billingCycle` (`MONTHLY`, `YEARLY`), `nextBillingDate` (DateTime), `categoryId` (Nullable), `walletId` (Nullable), `isActive` (Boolean, default: `true`).
* **Bill**: `id`, `userId` (FK -> User, Cascade), `name`, `amount` (Decimal), `dueDate` (DateTime), `isPaid` (Boolean, default: `false`), `category` (String).

### 10. Shared Expense Groups (`groups`, `group_expenses`, `group_expense_splits`, `group_settlements`)
* **Group**: `id`, `name`, `createdBy` (FK -> User, Cascade), many-to-many members relation.
* **GroupExpense**: `id`, `groupId` (FK -> Group, Cascade), `title`, `amount` (Decimal), `paidById` (FK -> User, Cascade), `date`.
* **GroupExpenseSplit**: `id`, `groupExpenseId` (FK -> GroupExpense, Cascade), `userId` (FK -> User, Cascade), `amountOwed` (Decimal).
* **GroupSettlement**: `id`, `groupId` (FK -> Group, Cascade), `paidById` (FK -> User, Cascade), `paidToId` (FK -> User, Cascade), `amount` (Decimal), `date`.

---

## 🔗 Related Resources
* Read [[CODEX.md]] for Prisma conventions.
* Visit [[wiki/backend]] for router mappings.
