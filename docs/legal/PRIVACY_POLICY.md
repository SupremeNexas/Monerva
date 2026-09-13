# Privacy Policy

**Last Updated:** September 13, 2026

`[LEGAL_ENTITY_NAME_REQUIRED]` ("Company", "we", "us", or "our") respects your privacy and describes herein how personal data is handled within **Monerva** (the "Service").

---

### 1. Information Collected and Stored

#### 1.1 Information You Provide Directly
- **Account Information:** Full name, preferred display name, email address, avatar URL, base currency, country, and timezone.
- **Financial Ledger Data:** Income bracket, financial goals, custom budget limits, category names, transaction amounts, dates, notes, and merchant names.
- **Document & Receipt Uploads:** Receipt image files (PNG, JPG) and document PDFs uploaded to your financial vault.
- **Legal Consent Logs:** Consent timestamps (`termsAcceptedAt`) and terms version strings (`termsVersion`).

#### 1.2 Information Stored in Browser Web Storage
Monerva uses browser `localStorage` to maintain application state:
- `fintech_token`: JWT bearer access token for API authorization.
- `fintech_refresh_token`: Token string used to refresh access tokens upon expiration.
- `fintech_workspace_id`: Active workspace preference selection.
- `fintech_chat_history`: Locally cached AI assistant message history.

#### 1.3 Technical Server Logs
Application hosting servers record standard operational log entries (including client IP address, user-agent header, and request path/timestamp) for security monitoring and runtime diagnostic purposes.

#### 1.4 Credentials Not Collected
Monerva does not request, collect, or store:
- Bank account passwords or netbanking PINs
- Credit/debit card CVV codes or PINs
- UPI PINs or One-Time Passwords (OTPs)
- Government identification numbers (such as Aadhaar, SSN, or Tax IDs)

---

### 2. Purposes of Processing

Collected information is processed for the following operational purposes:
1. Providing personal expense ledger features, budget analytics, and transaction categorization.
2. Computing local vector embeddings of uploaded vault documents (`@xenova/transformers`) to support in-app semantic document search.
3. Extracting transaction values from receipt images via AI service integrations.
4. Managing workspace permissions, tenant isolation, and legal consent logging.
5. Operating security audit logs and supporting technical troubleshooting.

---

### 3. Third-Party Data Processors Inventory

The following external infrastructure and third-party service providers process data in connection with Monerva:

| Processor | Platform Role | Data Transmitted / Stored | Data Handling & Privacy Safeguards |
| :--- | :--- | :--- | :--- |
| **Vercel** | Frontend Hosting & Edge Routing | Browser HTTP headers, IP address, static frontend asset requests | Governed by Vercel Privacy Notice; serves client web assets |
| **Render** | Backend API Application Server | API request payloads, auth tokens, uploaded receipt/PDF files in transit, server execution logs | Governed by Render Privacy Policy; executes application backend logic |
| **PostgreSQL Provider** | Relational Database Storage | User profiles, encrypted password hashes (bcrypt), ledgers, budgets, document metadata, document chunk embeddings | Database hosting provider (Render PostgreSQL / Supabase / Neon / self-hosted) per operator configuration |
| **Google OAuth 2.0** | Third-Party Authentication | OAuth authorization codes, email, display name, profile avatar URL | Governed by Google Privacy Policy; standard OAuth 2.0 identity verification |
| **Google Gemini API** | Receipt OCR & AI Assistant | Receipt images, sanitized prompt query strings | Transmitted over TLS; data retention and training rules depend on Google Cloud / Gemini API terms for the operator's configured API tier |

---

### 4. Browser Local Storage Security Disclosures

Monerva uses browser `localStorage` rather than HTTP-only cookies for authentication session state. Items saved in `localStorage` can be read by JavaScript code executing within the application origin. To mitigate security risks:
- API communications require HTTPS/TLS encryption.
- Tokens carry explicit expiration limits.
- Users are advised to access Monerva from secure devices and maintain updated web browser software.

---

### 5. Data Retention & Account Deletion

5.1 **Active Database Erasure:** Executing account deletion via Profile Settings triggers an atomic database transaction (`DELETE /api/auth/account`) that deletes active relational records associated with your user ID (user profile, transactions, budgets, goals, document chunks, receipts, and user settings).

5.2 **Distinction Across Data Stores:**
- **Active Database:** Purged immediately upon user-initiated account deletion.
- **Provider Backup Snapshots:** Disaster recovery snapshots created by the database hosting provider are retained according to the provider's automated backup lifecycle and retention schedule.
- **Server Access Logs:** Operational HTTP logs on hosting platforms (Render/Vercel) are retained per platform log retention policies.
- **Third-Party API Logs:** Processing logs generated by external API services (e.g. Google Gemini API) are subject to third-party provider log retention schedules.

---

### 6. Contact & Grievance Redressal

For privacy inquiries or grievance redressal, contact:
- **Legal Entity:** `[LEGAL_ENTITY_NAME_REQUIRED]`
- **Registered Address:** `[REGISTERED_ADDRESS_REQUIRED]`
- **Grievance Officer:** `[GRIEVANCE_OFFICER_NAME_REQUIRED]`
- **Contact Email:** `[CONTACT_EMAIL_REQUIRED]`
