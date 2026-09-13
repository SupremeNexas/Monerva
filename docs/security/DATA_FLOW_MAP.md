# Monerva System Data Flow Map & Architecture Blueprint

**Document Date:** September 13, 2026  
**System Name:** Monerva Personal Financial Management & Document Intelligence Platform  
**Target Release:** v1.0 Production Release Candidate  

---

## 1. High-Level System Architecture & Data Boundaries

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER                                         │
│   React 19 / Vite Single Page Application (Web Browser)                                 │
│   Stored Local Data: JWT Access Token (Memory/LocalStorage), Workspace ID              │
└─────────────────────────────────────────┬──────────────────────────────────────────────┘
                                          │ TLS 1.3 / HTTPS API Requests
                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND API LAYER                                     │
│   Express REST API (TypeScript) on Node.js                                             │
│   • Middleware: JWT Auth, Rate Limiting, Helmet Headers, Express Validator             │
│   • In-Process Embedder: @xenova/transformers (384-dim feature-extraction)            │
│   • In-Process PDF Engine: pdf-parse & Magic-Byte Validator                            │
└───────────────┬─────────────────────────┬─────────────────────────────┬────────────────┘
                │                         │                             │
    Prisma ORM  │             Google GSI  │                 Gemini API  │
                ▼                         ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────┐ ┌───────────────────────────────┐
│     DATABASE LAYER        │ │   IDENTITY PROVIDER   │ │      AI ENGINE LAYER          │
│ PostgreSQL (Supabase)     │ │ Google OAuth 2.0      │ │ Google Gemini API             │
│ • User Profiles           │ │ • ID Token Verification│ │ • Vision OCR Receipt Parsing   │
│ • Transactions & Ledgers  │ │ • Profile Metadata    │ │ • Grounded Document RAG Summaries│
│ • PDF Metadata & Documents│ └───────────────────────┘ └───────────────────────────────┘
│ • 384-dim Vector Chunks   │
└───────────────────────────┘
```

---

## 2. Comprehensive Data Element Inventory

| Category | Specific Fields | Processing Purpose | Storage Location | Retention Period |
|---|---|---|---|---|
| **Identity Data** | Email, Name, Display Name, Avatar URL, Country, Currency, Timezone, Terms Acceptance Timestamp/Version | Account authentication, workspace customization, legal consent record | PostgreSQL (`users`) | Duration of account lifecycle |
| **Financial Ledgers** | Transaction Amount, Category, Date, Merchant, Notes, Wallet Balance, Credit Card Limits, Bills, Subscriptions | Ledger accounting, budget calculation, category analytics | PostgreSQL (`transactions`, `wallets`, `credit_cards`, `bills`) | Duration of account lifecycle |
| **Document Vault** | Original PDF File Name, MIME Type, File Size, Chunk Index, Page Number, Extracted Text | User-initiated semantic document search (RAG) | PostgreSQL (`documents`, `document_chunks`) | Until user deletes document or account |
| **Vector Chunks** | 384-dimensional floating point embedding array (`Float[]`) | Cosine similarity vector search | PostgreSQL (`document_chunks.embedding`) | Deleted with parent document or account |
| **AI Query Context** | User search queries, retrieved text chunks, receipt image buffers | Receipt OCR extraction & RAG answer generation | Transmitted transiently to Gemini API over TLS | Not retained (Enterprise non-training API) |

---

## 3. Detailed Data Flow Scenarios

### Flow A: User Registration & Legal Consent Logging
1. User submits registration details or completes Google OAuth flow on the frontend.
2. Express backend receives payload, creates user record via Prisma.
3. System automatically sets `termsAcceptedAt = new Date()` and `termsVersion = "1.0"`.
4. JWT token returned to client and stored securely.

### Flow B: PDF Document Upload & Vector Indexing
1. User selects a PDF document in `DocumentsPage.tsx`.
2. Document sent as multipart form-data to `POST /api/documents`.
3. Backend validates magic bytes (`%PDF-`), parses text page-by-page via `pdf-parse`.
4. Text split into 200-character chunks with overlap and metadata.
5. In-process pipeline (`@xenova/transformers`) generates 384-dim vector embeddings.
6. Document metadata and vector chunks saved to PostgreSQL (`documents` and `document_chunks` tables) bound to `userId` and `workspaceId`.

### Flow C: Document RAG Question & Answering
1. User enters document question in `AIAssistantPage.tsx`.
2. Backend embeds query text into 384-dim vector.
3. Performs cosine similarity search over `document_chunks` filtered strictly by `userId` and `workspaceId`.
4. Retrieved chunks sanitized via `sanitizeDocumentText` and formatted into protective XML tags (`<document_context>`).
5. Payload sent to Google Gemini API with system instructions to ignore prompt injection.
6. Grounded response with document citations returned to frontend.

### Flow D: Atomic Account Erasure (Right to Erasure)
1. User requests permanent deletion in *Profile > Danger Zone*.
2. Client calls `DELETE /api/auth/account`.
3. Backend opens Prisma `$transaction`:
   - Purges `document_chunks`
   - Purges `documents`
   - Purges `receipts`
   - Purges `transactions`, `recurring_transactions`, `subscriptions`
   - Purges `budgets`, `goals`, `bills`, `credit_cards`, `wallets`, `categories`
   - Purges `friendships`, `group_expenses`, `workspace_members`
   - Deletes `user` record
4. All tokens cleared; client redirected to root landing page.

---

## 4. Third-Party Data Transfer Matrix

| Provider | Data Transmitted | Security Safeguards | Purpose |
|---|---|---|---|
| **Google OAuth** | Google ID Token (credential) | Verified via `google-auth-library` over TLS | User sign-in & identity verification |
| **Google Gemini AI** | Receipt images & RAG context chunks | Encrypted in transit (TLS 1.3), enterprise non-training terms | OCR scanning & document QA |
| **Supabase (PostgreSQL)** | All application tables & vector embeddings | Transport encryption, isolated tenant DB schemas | Primary application persistence |
| **Vercel / Render** | Web application static assets & API HTTP payloads | TLS/HTTPS standard transport security | Application web hosting |
