# Finova Privacy Policy

**Last Revised:** September 2026  
**Version:** 1.0  
**Operator:** Finova Systems

---

## Privacy Protection Commitment
Finova collects only the data necessary to deliver personal finance accounting, receipt scanning, and document retrieval. We do **NOT** sell your personal financial records to third-party ad networks or data brokers.

---

## 1. Data Collected & Purpose
We collect data strictly to provide financial tracking services:
- **Identity Data:** Name, display name, email address, profile picture URL (if using Google OAuth), country, base currency, and timezone.
- **Financial Ledgers:** Transaction amounts, categories, dates, payment method tags, notes, wallets, credit cards, budgets, savings goals, recurring bills, and subscriptions.
- **Social & Shared Ledgers:** Friend connections, group memberships, shared expense splits, and debt balances.
- **Uploaded Content & RAG Vault:** PDF financial documents uploaded to the Financial Vault are processed into extracted text and 384-dimensional vector embeddings stored in PostgreSQL to enable user-initiated semantic document search.
- **AI Query Data:** Questions submitted to the AI Assistant and receipt images uploaded for OCR extraction are processed via Google Gemini API to extract financial data structures.

---

## 2. Third-Party Data Transfers
To operate Finova technically, certain data is processed through essential infrastructure providers:
- **Google OAuth & Identity:** Verifies user identity ID tokens. Only profile email, sub ID, name, and avatar are received.
- **Google Gemini AI:** Receipt images and AI Assistant text queries are transmitted to Google Gemini API for structural JSON extraction. Transmitted data is non-persistent for API customers and not used to train public foundation models.
- **Hosted PostgreSQL & Vector Store:** Database hosting provider (Render/Supabase) hosts encrypted relational data and vector embeddings.

---

## 3. Data Retention & Deletion
- **Active Retention:** Data is retained while your account remains active.
- **Atomic Deletion:** Account deletion completely purges all user data across all tables atomically.
- **No Residual Archives:** Personal financial records are permanently expunged upon deletion.

---

## 4. User Privacy Rights
You have the right to:
- Access and inspect your financial records.
- Export all transactions to CSV format at any time.
- Correct or update profile preferences.
- Delete your account and purge all associated data.

---

## 5. Contact Information
For privacy inquiries or data rights requests, contact: `privacy@finova.app`.
