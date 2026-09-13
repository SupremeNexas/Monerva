# Data Deletion & Retention Policy

**Last Updated:** September 13, 2026

`[LEGAL_ENTITY_NAME_REQUIRED]` ("Company", "we", "us") provides complete control over personal ledger data stored within **Finova**.

---

### 1. User-Initiated Account Deletion Flow

1.1 **Trigger:** Users can initiate permanent data erasure at any time via `Profile Settings -> Danger Zone -> Delete Account & Purge My Data`.
1.2 **Confirmation:** Account erasure requires typing explicit confirmation text (`DELETE`).
1.3 **API Endpoint:** The request is processed by `DELETE /api/auth/account`.

---

### 2. Active Database Erasure Scope

Account deletion executes an atomic database transaction purging all records associated with the user ID across all database relations:

| Data Category | Purged Records |
| :--- | :--- |
| **User Credentials** | User account profile, password hashes, OAuth tokens, email, consent logs |
| **Financial Ledgers** | All transactions, recurring items, subscriptions, custom categories |
| **Budgets & Goals** | Budget limits, savings goals, goal contributions, bill reminders |
| **Wallets & Cards** | Connected wallet ledgers, credit card profiles |
| **Vault Documents** | Uploaded document PDFs, receipt metadata, OCR extraction records |
| **Vector Embeddings** | All 384-dimensional text embeddings (`DocumentChunk` records) |
| **Social & Shared** | Group expenses, expense splits, friend settlements, group memberships |
| **System State** | System notifications, user settings, audit logs, workspace memberships |

---

### 3. Backup Snapshots & System Logs Retention

3.1 **Encrypted Disaster Recovery Backups:** Active database record deletion occurs immediately. Encrypted database backups retained for operational disaster recovery naturally overwrite and expire according to a **30-day cloud provider retention schedule**.

3.2 **Security Access Logs:** System infrastructure request logs (containing IP address, user-agent, and endpoint access timestamps) are retained for up to 30 days for operational security monitoring before automatic deletion.
