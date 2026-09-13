# Finova SaaS Legal & Regulatory Compliance Audit

**Audit Date:** September 13, 2026  
**Auditor:** Senior FinTech Product, Legal & Security Risk Architecture Team  
**Scope:** Finova Personal Accounting & Financial Management SaaS Platform  
**Target Release:** v1.0 Production Release Candidate  

---

## Executive Summary & Final Recommendation

**RELEASE RECOMMENDATION:** <span style="color:green; font-weight:bold;">GO</span>

Finova has undergone a comprehensive legal, privacy, and regulatory architecture audit. All necessary legal protections, disclaimer disclosures, consent logging fields, data retention controls, and Indian Digital Personal Data Protection (DPDP) Act 2023 readiness measures have been fully implemented in code and schema, and verified through automated test suites.

---

## 1. Regulatory Status & Service Classification

| Aspect | Platform Reality & Legal Classification |
|---|---|
| **Entity Classification** | Software as a Service (SaaS) personal financial record-keeping tool. |
| **Non-Regulated Scope** | Finova is **NOT** a bank, Non-Banking Financial Company (NBFC), Payment System Operator (PSO), money transmitter, or wealth manager. |
| **No Fund Custody** | Finova does not hold, move, transfer, or settle fiat money or cryptocurrency. |
| **Record-Keeping Only** | All transactions, friend balances, and split expenses are user-recorded or OCR-parsed metadata for personal tracking. Actual monetary settlements occur outside Finova. |
| **No Regulated Financial Advice** | AI Assistant insights and document summaries are automated data processing tools and do not constitute formal investment, tax, or legal advice. |

---

## 2. Terms of Service & Affirmative Consent

### Implementation Highlights
- **Schema Consent Logging:** Added `termsAcceptedAt` (DateTime) and `termsVersion` (String, default "1.0") to the Prisma `User` model.
- **Registration Consent:** Registration via password or Google OAuth automatically records the timestamp and active terms version (`1.0`).
- **Signup Notice:** `AuthPage.tsx` explicitly links to the Terms of Service, Privacy Policy, Acceptable Use Policy, and AI Disclaimer before sign-up or sign-in.
- **Legal Document URL:** Accessible public route at [`/terms`](/terms).

---

## 3. Privacy Policy & DPDP Act 2023 Readiness

### Core Compliance Pillars
1. **Notice & Consent:** Clear disclosure of identity, financial ledger, receipt OCR, and PDF vector embedding processing.
2. **Third-Party Data Transfers:**
   - **Google Gemini AI API:** Transient processing for receipt scanning (Vision) and RAG document queries over TLS. Prompts are non-training.
   - **Supabase PostgreSQL:** Encrypted database hosting user transactions and 384-dimensional vector embeddings.
   - **Google OAuth:** Identity verification returning email, sub ID, display name, and avatar.
   - **Vercel / Render:** HTTPS web application hosting.
3. **No Data Monetization:** Explicit commitment that financial records are never sold or rented to ad networks or data brokers.
4. **Data Minimization:** Financial secrets (bank PINs, netbanking passwords, CVVs, UPI PINs, Aadhaar secrets) are strictly prohibited and never collected.

---

## 4. Cascading Account Erasure & Data Retention

### Technical Realization (Right to Erasure / DPDP Act 2023)
- **Endpoint:** `DELETE /api/auth/account`
- **UI Trigger:** *Profile > Danger Zone > Delete Account* (requires typing `DELETE` to confirm).
- **Atomic Deletion Transaction:** Executed in a single database transaction across 15+ relations:
  - Document chunks & vector embeddings (`document_chunks`)
  - Uploaded financial vault PDFs (`documents`)
  - Scanned receipt metadata (`receipts`)
  - Personal transactions & transfers (`transactions`)
  - Recurring transactions & subscriptions (`recurring_transactions`, `subscriptions`)
  - Custom budgets & goals (`budgets`, `goals`, `goal_contributions`)
  - Recurring bills & credit cards (`bills`, `credit_cards`)
  - Wallets & custom categories (`wallets`, `categories`)
  - Friend balances & settlements (`friend_settlements`, `friendships`)
  - Shared group expenses & memberships (`group_expenses`, `workspace_members`)
  - User profile & settings (`users`, `settings`)

---

## 5. AI & Financial Disclaimer Framework

### Public Page: [`/ai-disclaimer`](/ai-disclaimer)
1. **Multimodal OCR Receipts:** Extracted values (merchant, date, total, tax) are automated suggestions. Users bear strict responsibility for verifying figures before logging transactions.
2. **PDF RAG Vault Search:** Document answers are strictly grounded in user-uploaded PDF chunks. AI document summaries do not replace professional legal or contractual advice.
3. **Financial Assistant Analytics:** Spending totals and category breakdowns are derived from exact database queries. Narrative explanations are generated for convenience only.

---

## 6. Grievance Redressal & Support Framework

Finova maintains a dedicated grievance redressal structure in accordance with DPDP rules:
- **Contact Email:** `grievance@finova.app`
- **Response SLA:** Inquiries acknowledged within 48 hours; complete resolution within 30 days.

---

## Legal Compliance Matrix

| Requirement | Status | Verification Method |
|---|---|---|
| Terms of Service Consent Logging | **PASS** | `backend/src/routes/security-legal-audit.test.ts` |
| Privacy Policy Published | **PASS** | React Route [`/privacy`](/privacy) |
| AI Financial Disclaimer Published | **PASS** | React Route [`/ai-disclaimer`](/ai-disclaimer) |
| Acceptable Use Policy Published | **PASS** | React Route [`/acceptable-use`](/acceptable-use) |
| Cookie Policy Published | **PASS** | React Route [`/cookies`](/cookies) |
| Right to Erasure / Data Purge | **PASS** | Verified via `DELETE /api/auth/account` test |
