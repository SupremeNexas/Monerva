# Monerva Directory & Project Structure

This document outlines the organized, modular directory layout of the Monerva enterprise-grade personal finance platform.

---

## High-Level Architecture Overview

```
Monerva Repository Root
├── frontend/                 # React 19 + TypeScript + Vite Single Page Application
├── backend/                  # Node.js + Express + Prisma REST API & AI Engine
├── docs/                     # Central documentation directory
│   ├── legal/                # Legal policies, compliance docs & legal audit
│   ├── security/             # Security policy, threat model & data flow maps
│   ├── architecture/         # Product requirements, DB schemas & UI specs
│   ├── development/          # Developer guides, changelogs & roadmap
│   ├── knowledge/            # Obsidian-compatible knowledge vault
│   ├── obsidian-vault/       # Additional Obsidian workspace files
│   └── wiki/                 # Deep domain wiki pages & technical documentation
├── scripts/                  # Shell scripts, database startup & utility scripts
├── README.md                 # Primary project overview
├── package.json              # Root workspace scripts (dev, test, build, typecheck)
├── render.yaml               # Render cloud deployment blueprint
└── vercel.json               # Vercel deployment configuration
```

---

## Detailed Directory Breakdown

### 1. `frontend/` (Frontend Application)
- **`src/pages/`**: Application screens and page components (Dashboard, Expenses, AIAssistant, Documents, Income, Transfers, Legal pages).
- **`src/components/`**: Modular UI components grouped by feature domain:
  - `Layout/`: App navigation, Sidebar, Header, Page layout wrappers.
  - `Dashboard/`: Financial alert banners, net worth meters, transaction activity widgets.
  - `Expenses/`: Transaction table, smart filter bar, CSV import modal, bill scanner modal.
  - `AI/`: Chat UI, insight cards, document upload widget.
  - `UI/`: Reusable primitives (Buttons, Modals, Toasts, Skeletons, SpecularButton).
- **`src/api/`**: Axios API client configured with auth headers and base URLs.
- **`src/store/`**: Zustand state management stores (auth store).
- **`src/types/`**: TypeScript interface definitions for financial ledgers, AI responses, and API models.
- **`src/assets/`**: Images, icons, and UI design token definitions (`ui-tokens/`).

---

### 2. `backend/` (Backend Service & AI Engine)
- **`server.ts`**: Express application entry point configuring middleware, routes, CORS, and security headers.
- **`prisma/`**: PostgreSQL database schema (`schema.prisma`), migrations, and seed scripts (`seed.ts`).
- **`tests/`**: Suite of 76+ automated integration and unit tests:
  - `security-legal-audit.test.ts`: Legal consent & account erasure tests.
  - `documents-rag.test.ts`: PDF parsing, vector search, & prompt safety tests.
  - `ai-architecture.test.ts`: Provider routing & math grounding tests.
  - `scan-bill.test.ts`: OCR extraction & duplicate detection tests.
  - `transfers.test.ts`, `income-tracking.test.ts`, `financial-alerts.test.ts`, `expenses-search-filter.test.ts`, `csv-import-export.test.ts`, `settlements-debt-simplification.test.ts`.
- **`src/routes/`**: Express REST API endpoint handlers (`auth`, `expenses`, `income`, `transfers`, `documents`, `ai`, `alerts`, `analytics`, `friends`, `groups`, `workspaces`, etc.).
- **`src/middleware/`**: Request middleware (`auth`, `rbac`, `pro`, `validation`, `error`).
- **`src/services/`**: Core business domain logic:
  - **`ai/`**: Structured AI & RAG system:
    - `providers/`: LLM abstraction layer (`provider.ts` for Google Gemini Text/Vision & Mock fallbacks).
    - `scanner/`: Receipt and bill OCR extraction (`billScanner.ts`).
    - `assistant/`: Financial assistant (`coach.ts`, `intent.service.ts`, `query.service.ts`, `analysis.service.ts`, `response.service.ts`, `financialInsights.ts`).
    - `documents/`: PDF parsing and text chunking (`document.service.ts`, `documentProcessor.ts`).
    - `embeddings/`: 384-dimensional text embeddings (`embeddings.service.ts`).
    - `vectorstore/`: Vector database storage and cosine similarity search (`vectorStore.ts`).
    - `rag/`: Retrieval-Augmented Generation pipeline (`rag.service.ts`, `rag.ts`).
    - `security/`: Anti-prompt-injection sanitization (`promptProtection.ts`).
    - `prompts/`: System instructions & structured output schemas.
  - `alerts/`: Budget thresholds, credit card utilization, and limit tracking.
  - `csv/`: CSV parsing and preview/commit engine.
  - `splits/`: Debt simplification and split engine.
  - `db/`: Prisma client singleton wrapper.

---

### 3. `docs/` (Documentation & Legal Center)
- **`legal/`**:
  - `TERMS_OF_SERVICE.md`: Terms of service agreement.
  - `PRIVACY_POLICY.md`: Data privacy practices and third-party processing.
  - `AI_DISCLAIMER.md`: Disclaimer on non-advisory AI insights and OCR accuracy.
  - `ACCEPTABLE_USE_POLICY.md`: Permissible system use and forbidden financial secrets.
  - `COOKIE_POLICY.md`: Local web storage & session token policy.
  - `DATA_DELETION_POLICY.md`: Technical guarantees for self-service account erasure.
  - `LEGAL_AUDIT.md`: Legal compliance assessment.
- **`security/`**:
  - `SECURITY_POLICY.md`: Vulnerability reporting & security architecture.
  - `SECURITY_AUDIT.md`: Security vulnerability audit report.
  - `DATA_FLOW_MAP.md`: Boundary data flow map across frontend, backend, AI API, and database.
- **`architecture/`**: Product specs (`APRD.md`, `DATABASE_PRD.md`, `DESIGN_UI.md`).
- **`development/`**: Developer resources (`AGENTS.md`, `CODEX.md`, `CONTEXT.md`, `CHAT_SUMMARY.md`, `FREE_TIER.md`, `ROADMAP.md`).
- **`knowledge/` & `obsidian-vault/`**: Human-AI obsidian knowledge notes and vault.
- **`wiki/`**: In-depth feature guides (AI, Analytics, Auth, RAG, Transactions, Wallets, Workspaces).

---

### 4. `scripts/` (Scripts & Operations)
- `run_db.sh`: Local PostgreSQL daemon controller script (Port 5433).
- `render_timetable_image.py`: Developer utility script for image generation.

---

## Where to Find Major Features

| Feature Domain | Backend Code | Frontend Code | Documentation |
| :--- | :--- | :--- | :--- |
| **Authentication & Users** | `backend/src/routes/auth.ts` | `frontend/src/pages/AuthPage.tsx` | `docs/wiki/authentication.md` |
| **Receipt / Bill Scanner** | `backend/src/services/ai/scanner/` | `frontend/src/components/Expenses/BillScannerModal.tsx` | `docs/legal/AI_DISCLAIMER.md` |
| **Financial AI Assistant** | `backend/src/services/ai/assistant/` | `frontend/src/pages/AIAssistantPage.tsx` | `docs/wiki/financial-assistant.md` |
| **Document RAG Vault** | `backend/src/services/ai/rag/`, `documents/`, `vectorstore/` | `frontend/src/pages/DocumentsPage.tsx` | `docs/wiki/rag.md` |
| **Legal & Privacy Policies** | `docs/legal/` | `frontend/src/pages/TermsPage.tsx`, `PrivacyPage.tsx`, etc. | `docs/legal/` |
| **Security Audits & Policies**| `docs/security/` | N/A | `docs/security/` |
| **Database Schema** | `backend/prisma/schema.prisma` | N/A | `docs/architecture/DATABASE_PRD.md` |
