# Data Flow Map & Architecture Specification

**Last Updated:** September 13, 2026

This document outlines data flows, storage locations, third-party processing boundaries, and security controls within **Finova** (`[LEGAL_ENTITY_NAME_REQUIRED]`).

---

### 1. Data Flow Diagram

```
[ User Browser ]
   │
   ├─► Client Authentication (JWT stored in browser localStorage)
   │
   ▼ TLS / HTTPS (Encrypted in transit)
[ Express API Server ]
   │
   ├─► Authentication & Tenant Scoping (userId, workspaceId verification)
   ├─► Prompt Injection Sanitization (Input text scrubbing)
   │
   ├───────────► [ Google Gemini API ] (Over TLS)
   │               - Receipt image OCR extraction
   │               - RAG conversational assistant responses
   │               - Governed by Google Cloud API Privacy (No model training)
   │
   ├───────────► [ Local @xenova/transformers ] (In-memory on backend)
   │               - Generates 384-dimensional vector embeddings
   │
   ▼ Prisma ORM
[ PostgreSQL Database ]
   - User Accounts & Legal Consent Timestamps (termsAcceptedAt, termsVersion)
   - Encrypted Password Hashes (bcrypt)
   - Transactions, Budgets, Wallets, Goals
   - Encrypted Document Chunks & Local Vector Embeddings
```

---

### 2. Third-Party Data Processors

| Processor | Purpose | Data Transmitted | Privacy Safeguards |
| :--- | :--- | :--- | :--- |
| **Google Gemini API** | Receipt OCR & Financial Assistant | Receipt images, sanitized prompt queries | Cloud API Privacy Terms; payload data not retained for model training |
| **Google OAuth 2.0** | Third-party user authentication | Email, display name, profile avatar URL | Standard OAuth 2.0 authorization code grant flow |

---

### 3. Data Storage & Security Controls

| Data Type | Storage Location | Protection Mechanism |
| :--- | :--- | :--- |
| **Session Credentials** | Browser `localStorage` | Bearer JWT; restricted scope |
| **User Passwords** | PostgreSQL Database | Bcrypt password hashing (salt round 10+) |
| **Ledger & Document Data**| PostgreSQL Database | Logical tenant isolation (`userId`, `workspaceId`) |
| **Vector Embeddings** | PostgreSQL Database (`document_chunks` table) | In-process generation (`@xenova/transformers`), strict tenant filtering |
| **Database Backups** | Cloud Provider Encrypted Storage | AES-256 backup encryption; 30-day auto-purge retention schedule |
