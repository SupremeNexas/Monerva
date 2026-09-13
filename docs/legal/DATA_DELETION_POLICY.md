# Finova Data & Account Deletion Policy

**Last Revised:** September 2026  
**Version:** 1.0  
**Operator:** Finova Systems

---

## 1. Overview
Finova respects user autonomy and privacy. Users have full control over their financial records and personal data, including the right to permanently purge their account and data at any time.

---

## 2. Self-Service Account Erasure
Users can trigger account deletion directly from the application UI:
1. Navigate to **Profile Page** (`/profile`).
2. Click **Delete Account** in the Danger Zone.
3. Confirm account deletion.

---

## 3. Atomic Cascading Deletion Technical Guarantees
Upon account deletion confirmation, the backend database executes an atomic cascading delete across all associated relational tables:
- **User Record & Profile Settings**
- **Transactions, Expenses & Incomes**
- **Wallets & Credit Cards**
- **Budgets, Financial Alerts & Goals**
- **Subscriptions & Recurring Bills**
- **Friends, Group Memberships & Expense Splits**
- **Uploaded PDF Documents, Document Chunks & Vector Embeddings**
- **AI Chat History & Intent Context**

---

## 4. Manual Deletion Requests
If a user is unable to access their account, data deletion requests can be submitted via email to `privacy@finova.app`. Requests are processed and verified within 48 hours.
