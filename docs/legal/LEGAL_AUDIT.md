# Factual & Legal Document Audit Report

**Audit Date:** September 13, 2026  
**Auditor:** Automated Factual & Legal Security Audit Suite  
**Final Status Recommendation:** **CONDITIONAL GO** (Release-blocked pending legal placeholder resolution and human legal counsel review)

---

### Executive Summary

A factual and legal verification audit was performed on **Monerva** to verify that all statements in `docs/legal/` align with actual backend/frontend code, database schemas, deployment configurations, and third-party API policies.

While technical features—including atomic account deletion across 15+ relations, consent schema logging (`termsAcceptedAt`, `termsVersion`), local vector embedding generation (`@xenova/transformers`), prompt injection scrubbing, and tenant isolation—are implemented and verified by test suites, **public launch must remain conditionally blocked** until required corporate entity details (`[LEGAL_ENTITY_NAME_REQUIRED]`) and formal legal counsel reviews are completed.

---

### Verification Matrix

| Legal Document / Subject | Verification Status | Code & Architecture Evidence |
| :--- | :---: | :--- |
| **Legal Consent Tracking** | **VERIFIED** | Prisma schema records `termsAcceptedAt` (`DateTime?`) and `termsVersion` (`String?`) on user creation and profile updates. |
| **Cascading Account Deletion** | **VERIFIED** | `DELETE /api/auth/account` executes atomic Prisma transaction purging 15+ relations (transactions, documents, vector chunks, budgets, goals, social splits, notifications, audit logs, and user profile). |
| **Web Storage & Tokens** | **VERIFIED** | `localStorage` handles session tokens (`fintech_token`, `fintech_refresh_token`, `fintech_workspace_id`, `fintech_chat_history`). No HTTP-only tracking cookies are set. |
| **AI Data Processing & Safety** | **VERIFIED** | Local embeddings use `@xenova/transformers` in-process. Google Gemini API requests pass sanitized prompt contexts over TLS. Data retention claims are qualified per Google API terms. |
| **Third-Party Inventory** | **VERIFIED** | Identified production processors: Vercel (frontend host), Render (backend host), PostgreSQL provider (database), Google OAuth 2.0 (auth), Google Gemini API (AI services). |
| **Corporate Entity Placeholders**| **BLOCKED** | Retained necessary placeholders (`[LEGAL_ENTITY_NAME_REQUIRED]`, `[REGISTERED_ADDRESS_REQUIRED]`, `[GRIEVANCE_OFFICER_NAME_REQUIRED]`, `[CONTACT_EMAIL_REQUIRED]`). |

---

### Pre-Launch Blocking Dependencies

Before updating the status from **CONDITIONAL GO** to **FINAL GO**:
1. Replace `[LEGAL_ENTITY_NAME_REQUIRED]` across all documents in `docs/legal/` with the registered business entity name.
2. Replace `[REGISTERED_ADDRESS_REQUIRED]` with the official physical corporate registered address.
3. Appoint and publish details for `[GRIEVANCE_OFFICER_NAME_REQUIRED]` and `[CONTACT_EMAIL_REQUIRED]`.
4. Obtain formal legal sign-off from qualified legal counsel in target operating jurisdictions.

---

### Final Recommendation

**CONDITIONAL GO**  
*Technical implementation is verified and launch-ready; public commercial deployment is conditioned on completing corporate entity fill-ins and human legal counsel sign-off.*
