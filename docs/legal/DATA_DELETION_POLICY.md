# Data Deletion & Retention Policy

**Last Updated:** September 13, 2026

`[LEGAL_ENTITY_NAME_REQUIRED]` ("Company", "we", "us") describes herein data deletion mechanisms and retention distinctions for **Finova**.

---

### 1. User-Initiated Account Deletion Flow

1.1 **Trigger:** Users can initiate account deletion at any time via `Profile Settings -> Danger Zone -> Delete Account & Purge My Data`.  
1.2 **Confirmation:** Account deletion requires typing explicit confirmation text (`DELETE`).  
1.3 **API Execution:** The request executes `DELETE /api/auth/account`.

---

### 2. Active Database Erasure Scope

Account deletion executes an atomic Prisma database transaction (`prisma.$transaction`) purging records associated with the user ID across active database tables:

| Data Category | Table / Relation | Active Database Action |
| :--- | :--- | :--- |
| **User Profile & Auth** | `users`, `settings` | Deletes user profile, password hash, OAuth metadata, consent timestamps (`termsAcceptedAt`, `termsVersion`), and settings. |
| **Financial Records** | `transactions`, `recurring_transactions`, `subscriptions`, `receipts` | Deletes all user transactions, recurring ledger items, active subscriptions, and receipt records. |
| **Budgets & Goals** | `budgets`, `goals`, `goal_contributions`, `bills` | Deletes budget targets, savings goals, goal contribution records, and bill reminders. |
| **Wallets & Cards** | `wallets`, `credit_cards`, `categories` | Deletes connected wallet balances, credit card profiles, and custom user categories. |
| **Document Vault & RAG**| `documents`, `document_chunks` | Deletes uploaded vault document metadata and all associated 384-dimensional vector embedding chunks. |
| **Friend Records** | `friends`, `friend_settlements`, `friend_balances` | Deletes friendship links, settlements, and net balance summaries where the user is either party. |
| **Group Expenses & Splits**| `group_expense_splits`, `group_settlements`, `group_expenses` | Deletes user's individual expense splits, settlements paid/received, and group expenses paid by the user. |
| **Group Containers** | `groups` | **Creator:** If the user created a group, the group container and its associated group expenses/settlements are deleted.<br>**Member:** If the user is a non-creator member, only the user's splits/settlements are purged; the group container and other members' records remain intact. |
| **Workspaces & System State**| `workspace_members`, `workspaces`, `notifications`, `audit_logs` | Removes workspace membership. If a workspace has 0 remaining members, deletes automations and workspace container. Deletes user notifications and audit logs. |

---

### 3. Data Store Retention Distinctions

Data retention varies across operational data stores as follows:

1. **Active Relational Database:** Records are purged immediately upon successful execution of the `DELETE /api/auth/account` endpoint.
2. **Database Hosting Provider Backups:** Disaster recovery database snapshots maintained by the database hosting provider (e.g. Render PostgreSQL / Supabase / Neon) are retained according to the provider's automated backup retention schedule.
3. **Application & Server Logs:** Infrastructure request logs (containing client IP address, user-agent, request timestamp, and path) are retained per the logging schedules of the hosting platforms (Render / Vercel).
4. **Browser Web Storage:** Session token keys (`fintech_token`, `fintech_refresh_token`, `fintech_workspace_id`) are cleared from client browser `localStorage` upon logout or account deletion execution.
5. **Third-Party API Logs:** Requests sent to external service APIs (such as Google Gemini API for OCR scanning or query context) are subject to the third-party provider's log retention policies.
