# Project History: SettleKar Inheritance
Last Updated: 2026-07-05

This document records the architectural decisions, shared design patterns, and components adapted from the **SettleKar** repository (https://github.com/SupremeNexas/SettleKar), as well as the unique advancements introduced in the **Expense Tracker** project.

---

## 🏗️ Architectural Patterns Adopted
The Expense Tracker inherits the structural decisions established in the SettleKar ecosystem to maintain development consistency:

### 1. Unified Authentication Architecture
* **Flow**: Short-lived JWT access tokens stored in memory, paired with long-lived database-backed refresh tokens in `localStorage`.
* **Adapters**: Auth middleware (`backend/src/middleware/auth.ts`) validating tokens and scoping all database queries by the verified user session (`userId: req.user.id`).
* **Route Protection**: The frontend `<ProtectedRoute>` container in `frontend/src/App.tsx` redirects unauthorized views to `/auth` while performing silent background refresh attempts on load.

### 2. Workspace Folder Organization
```text
Expense-Tracker/
├── backend/            # Express Node API (SettleKar-inspired routes layout)
│   └── src/
│       ├── db/
│       ├── middleware/
│       └── routes/
└── frontend/           # Vite React SPA
    └── src/
        ├── api/        # Unified API clients
        ├── components/ # Shared UI library (Button, Modal, Dropdown, Sidebar)
        ├── store/      # Zustand state stores
        └── pages/      # View canvas page structures
```

---

## 🎨 Shared Component Library
We structured key components to mirror SettleKar's visual aesthetics:
* **Sidebar**: Flat, high-contrast navigation list with smooth indicator highlights.
* **Modal**: Frameless glassmorphic dialog container featuring a custom 10px backdrop-blur overlay and customizable maximum widths.
* **ExpenseForm**: Modular grouped layout fields with 16px radius inputs, custom chevron dropdown selectors, and larger amount numeric controls.
* **EmptyState**: Standard dashboard fallback panel rendering Lucide icon mappings and actionable buttons.

---

## 🚀 Improvements & Extensions over SettleKar
While inheriting structural guidelines, the Expense Tracker implements several design advancements:

### 1. Upgrade to Modern Web Standards
* **Core**: Built on **React 19** and **TailwindCSS v4**, utilizing native layers (`@import "tailwindcss"`) and optimized CSS assets.
* **Database**: Upgraded to a local **PostgreSQL** relational database cluster (Port `5433`) instead of simpler local SQLite systems, utilizing Prisma Client mappings.

### 2. AI-Native Tooling
* Integrated Andrej Karpathy's **LLM Wiki** documentation standards (`CLAUDE.md`, `CODEX.md`, `AGENTS.md`, and local `/memory` status registers) to allow agents to interact with context-constrained sub-elements.
* Implemented a multimodal AI vision **Gemini OCR Receipt Scanner** (`gemini-2.5-flash`) on the dashboard, coupled with a floating conversational **AI Coach** drawer loaded with context-rich user metrics.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for commands.
* Read [[CODEX.md]] for standards.
