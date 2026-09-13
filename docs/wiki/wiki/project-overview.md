# Project Overview: Expense Tracker
Last Updated: 2026-07-19

## 🎯 Product Purpose
The Personal Finance and Expense Tracker (**antigravity**) is a web application designed to help users manage their finances. It features multi-account balance sheets, categories tracking, budgets enforcement, credit cards limits monitoring, recurring bills lists, savings goals, and shared split-expense group ledgers. It leverages AI models to automate entry via receipt photo uploads and provides contextual feedback.

---

## 🛠️ Technology Stack

### Frontend (Client-side)
* **Framework**: React 19 (compiled via Vite SPA).
* **Language**: TypeScript (strict compiler settings).
* **Styling**: TailwindCSS v4 with global CSS variable definitions.
* **State Management**: Zustand stores for auth; TanStack React Query for cached backend requests.
* **Animations**: Framer Motion spring transitions.

### Backend (Server-side)
* **Runtime**: Node.js with Express.
* **Language**: TypeScript.
* **Database**: PostgreSQL (v15+) accessed via Prisma ORM Client.
* **Security**: JWT token cookies/headers, bcryptjs password hashing.
* **AI OCR**: Google Gemini API (`gemini-2.5-flash`) via the `@google/genai` client.

---

## 🚀 Core Product Features
1. **Protected Workspace Dashboard**: Spend tracking charts, category distributions, recent activity lists.
2. **Transaction Ledger**: CRUD operations for expenses and incomes, tags categorizations, location markings.
3. **Budget Monitors**: Custom threshold rings per category (Weekly/Monthly) with visual warnings.
4. **Credit Cards Tracker**: Limit bounds, billing cycles, minimum/total due trackers.
5. **Recurring Bills & Subscriptions**: Automatic monthly burn aggregations and obligation calendar.
6. **Savings Goals**: Target amounts, milestones, contribution records.
7. **Cooperative Shared Groups**: Ledger splits between members, settling balances.
8. **AI Integrations**: Vision receipt scanning and financial advisor coach drawer.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for commands.
* Visit [[wiki/architecture]] for system data flows.
* Visit [[wiki/database]] for schemas.
