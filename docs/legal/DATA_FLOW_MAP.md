# Data Flow Map & Architecture Specification

**Last Updated:** September 13, 2026

This document outlines data flows, storage locations, third-party processing boundaries, and security controls within **Finova** (`[LEGAL_ENTITY_NAME_REQUIRED]`).

---

### 1. Data Flow Diagram

```
[ User Browser ]
   │
   ├─► Client Web Storage (JWT tokens in browser localStorage)
   │
   ▼ TLS / HTTPS (Encrypted in transit)
[ Vercel Frontend Edge ]
   │
   ▼ Proxies /api/* requests to Render
[ Render Express Backend API ]
   │
   ├─► Authentication & Tenant Scoping (userId, workspaceId verification)
   ├─► Input Scrubbing (Prompt injection sanitization)
   │
   ├───────────► [ Google Gemini API ] (Over TLS)
   │               - Receipt image OCR extraction
   │               - RAG assistant query context responses
   │               - Policy governed by Google Gemini API Terms (per operator API tier)
   │
   ├───────────► [ Local @xenova/transformers ] (In-memory on backend)
   │               - Computes 384-dimensional vector embeddings
   │
   ▼ Prisma ORM
[ PostgreSQL Database Provider ]
   - User Accounts & Legal Consent Timestamps (termsAcceptedAt, termsVersion)
   - Password Hashes (bcrypt)
   - Transactions, Budgets, Wallets, Goals, Categories
   - Document Vault Metadata & Local Vector Embeddings (document_chunks)
```

---

### 2. Third-Party Data Processors Inventory

| Processor | Platform Role | Data Transmitted / Stored | Data Handling & Privacy Safeguards |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend Hosting & Edge Proxy | Client IP address, user agent, static asset requests | Serves compiled React web application bundle and proxies `/api/*` endpoints to Render |
| **Render** | Backend API Application Server | API request payloads, auth tokens, uploaded receipt/PDF files in transit, server execution logs | Executes Node.js/Express backend logic and handles database ORM queries |
| **PostgreSQL Provider** | Relational Database Storage | User profiles, password hashes (bcrypt), financial ledgers, budgets, document metadata, vector embeddings | Persistent relational database storage (Render PostgreSQL / Supabase / Neon / self-hosted per operator deployment) |
| **Google OAuth 2.0** | Third-Party Authentication | OAuth authorization code, email, display name, profile avatar URL | Standard OAuth 2.0 user authentication flow |
| **Google Gemini API** | Receipt OCR & AI Assistant | Receipt images, sanitized prompt query strings | API requests transmitted over TLS; data retention governed by Google Cloud / Gemini API terms for configured tier |

---

### 3. Data Storage & Security Controls

| Data Type | Storage Location | Protection Mechanism |
| :--- | :--- | :--- |
| **Session Credentials** | Browser `localStorage` | Bearer JWT (`fintech_token`, `fintech_refresh_token`) |
| **User Passwords** | PostgreSQL Database | Bcrypt password hashing (salt round 10) |
| **Ledger & Document Data**| PostgreSQL Database | Logical tenant isolation (`userId`, `workspaceId`) |
| **Vector Embeddings** | PostgreSQL Database (`document_chunks` table) | In-process generation (`@xenova/transformers`), strict tenant filtering |
| **Database Backups** | Database Provider Storage | Automated backup snapshots per database provider configuration |
