# Privacy Policy

**Last Updated:** September 13, 2026

`[LEGAL_ENTITY_NAME_REQUIRED]` ("Company", "we", "us", or "our") respects your privacy and is committed to protecting the personal data you share with us when using **Finova** (the "Service").

---

### 1. Information We Collect

#### 1.1 Information You Provide directly
- **Account Information:** Full name, preferred display name, email address, avatar URL, base currency, country, and timezone.
- **Financial Ledger Data:** Self-reported income bracket, financial goals, custom budget limits, category names, transaction amounts, dates, notes, and merchant names.
- **Document & Receipt Uploads:** Receipt image files (PNG, JPG) and document PDFs uploaded to your personal vault.
- **Legal Consent Logs:** Consent timestamps (`termsAcceptedAt`) and terms version strings (`termsVersion`).

#### 1.2 Information Automatically Collected
- **Browser Web Storage:** Access tokens (`fintech_token`) and refresh tokens (`fintech_refresh_token`) stored in your browser's `localStorage` to maintain session state.
- **Technical Logs:** Standard server request logs (IP address, user agent, endpoint access timestamps) recorded for security monitoring and operational diagnostic logging.

#### 1.3 Data We DO NOT Collect or Store
We strictly do **NOT** request, collect, process, or store:
- Bank account passwords or netbanking PINs
- Credit/debit card numbers, CVVs, or expiration dates
- UPI PINs or One-Time Passwords (OTPs)
- Government identification credentials (e.g., Aadhaar, SSN, PAN, Passport numbers)

---

### 2. How We Use Your Information

We use collected information solely for the following business purposes:
1. Providing, operating, and maintaining your personal expense tracking ledger and budget analytics.
2. Generating local vector embeddings of uploaded financial documents to enable semantic search within your isolated account context.
3. Extracting merchant, date, and amount details from uploaded receipt images via AI services.
4. Enforcing tenant isolation and verifying legal consent.
5. Responding to technical support requests and managing security audit logs.

---

### 3. Third-Party Integrations & Data Transfers

3.1 **Google Gemini API (AI Services):** When you upload receipts for optical recognition or submit queries to the financial assistant, relevant text/images are transmitted over encrypted TLS connections to the Google Gemini API. Data processed via Google Cloud API endpoints is governed by Google Cloud API Privacy Terms, which specify that customer API payload data is **not** used to train foundation models.

3.2 **Local Embedding Generation:** Document chunk text embeddings are computed locally on the application server using `@xenova/transformers` (384-dimensional vectors) and stored directly in your PostgreSQL database tenant scope. They are not transmitted to external third-party vector databases.

3.3 **No Data Sale:** We do **not** sell, rent, trade, or monetize your personal or financial data to data brokers, advertisers, or third parties.

---

### 4. Client Web Storage Reality

Finova uses browser `localStorage` for maintaining client-side authentication sessions (`fintech_token` and `fintech_refresh_token`). While `localStorage` facilitates seamless single-page application navigation, it does not carry `HttpOnly` cookie protections. Users are advised to access Finova only on secure, private devices and to keep web browsers updated against XSS vulnerabilities.

---

### 5. Data Retention & Permanent Deletion

5.1 **Active Database Erasure:** When you execute account deletion via your Profile Settings, all associated records in the active PostgreSQL database—including user credentials, transaction ledgers, uploaded documents, document chunks, budgets, goals, and notifications—are immediately and transactionally deleted.

5.2 **Cloud Backup Retention Schedule:** Encrypted database backup snapshots and system logs maintained for disaster recovery purposes naturally overwrite and expire according to a **30-day cloud provider retention schedule**. After 30 days, backup snapshots containing prior database states are permanently purged.

---

### 6. Contact & Grievance Redressal

If you have questions, concerns, or requests regarding this Privacy Policy or data protection, please contact our designated Grievance Officer:

- **Legal Entity:** `[LEGAL_ENTITY_NAME_REQUIRED]`
- **Registered Address:** `[REGISTERED_ADDRESS_REQUIRED]`
- **Grievance Officer:** `[GRIEVANCE_OFFICER_NAME_REQUIRED]`
- **Email:** privacy@example.com (or `[CONTACT_EMAIL_REQUIRED]`)
