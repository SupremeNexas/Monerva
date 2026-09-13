# Frontend Architecture
Last Updated: 2026-07-19

This document details the React 19 Single Page Application client structures, state systems, and API clients.

---

## ⚛️ Tech Specs & Library Stack
* **Vite + React 19**: Faster compile configurations and React Server hooks compatibility.
* **TypeScript**: Strict compile declarations inside `frontend/tsconfig.json`.
* **Zustand**: Client session state mapping.
* **TanStack React Query (v5)**: Server data caching and background fetch syncs.
* **Framer Motion**: Premium spring layouts and slide drawers.
* **TailwindCSS v4**: Fluid layout spacing and monochromatic styling tokens.

---

## 📂 Source Code Structure
The frontend application resides inside the `frontend/src/` folder:
* `main.tsx` — App entrypoint loading global CSS files and Query Providers.
* `App.tsx` — Routing configuration mapping public views (`LandingPage.tsx`, `AuthPage.tsx`) and private dashboards.
* `api/client.ts` — Axios/fetch API wrappers managing requests, bearer headers, and base endpoints.
* `store/authStore.ts` — Zustand store mapping session tokens, auth checks, and refresh schedules.
* `components/` — Reusable elements (Sidebar, Modals, forms, charts).
* `pages/` — Main canvas pages mapping different feature modules.
* `types/index.ts` — Central TypeScript interface declarations.

---

## 🔒 Session State: Zustand (`store/authStore.ts`)
The authentication store manages the active user session:
* `user`: Nullable active user details.
* `token`: Active short-lived JWT in-memory token.
* `setAuth(user, token)`: Saves session and writes long-lived `fintech_refresh_token` to `localStorage`.
* `checkAuth()`: Triggered on app mount. If `token` is missing but `fintech_refresh_token` is present, it calls `/api/auth/refresh` to quietly renew the session.

---

## 🔄 Cached Server State: React Query
We use TanStack Query for cache invalidation:
* **Query Keys**: `['categories']`, `['wallets']`, `['expenses']`, `['budgets']`, `['goals']`, `['bills']`, `['subscriptions']`.
* **Mutations**: Trigger database updates (e.g. `createExpense`) and invalidate the relevant query keys to trigger background updates.

---

## 🎨 UI Layout & Form Systems
* **Layout Wrapper**: `Layout.tsx` renders the dashboard grid with a custom responsive `Sidebar.tsx` and header.
* **Premium Forms**: `ExpenseForm.tsx` handles transaction data creation. Inputs feature custom focus indicators and rounded styling (`18px`).
* **Visual States**: Empty dashboards fallback to rendering `EmptyState.tsx` modules with Lucide icons.

---

## 🔗 Related Resources
* Visit [[wiki/ui-design-system]] for CSS styling details.
* Visit [[wiki/api-reference]] for client requests.
* Visit [[wiki/authentication]] for GSI auth details.
