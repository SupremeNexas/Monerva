# Cookie & Web Storage Policy

**Last Updated:** September 13, 2026

This Policy describes how **Monerva** (`[LEGAL_ENTITY_NAME_REQUIRED]`) utilizes browser web storage.

---

### 1. Cookies Disclosure

Monerva does not set third-party tracking cookies, advertising pixels, or marketing beacons. Monerva does not track user browsing activity across external websites.

---

### 2. Browser Local Storage Inventory

Monerva uses browser local storage (`localStorage`) to maintain client application state across page refreshes:

| Key Name | Category | Purpose |
| :--- | :--- | :--- |
| `fintech_token` | Essential | Bearer JSON Web Token (JWT) used to authorize REST API requests |
| `fintech_refresh_token` | Essential | Refresh token string used to obtain new access tokens upon expiration |
| `fintech_workspace_id` | Preference | Stores active workspace context selection |
| `fintech_chat_history` | UI State | Locally caches recent AI assistant conversation messages |

---

### 3. Security Disclosures regarding Web Storage

Unlike cookies configured with `HttpOnly` attributes, items stored in browser `localStorage` are accessible to JavaScript executing in the application origin. To mitigate risk:
- API communications are transmitted over TLS/HTTPS encryption.
- Authentication tokens carry explicit expiration limits.
- Users are advised to access Monerva from secure, private devices and maintain updated web browsers.

---

### 4. Managing Web Storage

Users can inspect or clear browser `localStorage` items at any time through browser developer tools or settings. Logging out of Monerva removes stored authentication token keys (`fintech_token`, `fintech_refresh_token`, `fintech_workspace_id`) from local web storage.
