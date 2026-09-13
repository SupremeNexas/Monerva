# Cookie & Web Storage Policy

**Last Updated:** September 13, 2026

This Policy describes how **Finova** (`[LEGAL_ENTITY_NAME_REQUIRED]`) uses browser cookies and local web storage.

---

### 1. No Third-Party Tracking Cookies

Finova does **not** deploy third-party tracking cookies, advertising beacons, marketing pixels, or analytics trackers (such as Google Analytics or Facebook Pixel). We do not track your browsing activity across third-party websites.

---

### 2. Browser Local Storage Usage

Rather than traditional server cookies, Finova uses client browser `localStorage` to preserve user session state across page updates in our single-page web application.

#### 2.1 Essential Web Storage Keys
- `fintech_token`: Json Web Token (JWT) bearer token used to authenticate REST API requests.
- `fintech_refresh_token`: Secure refresh token string used to request updated access tokens upon expiration.

#### 2.2 Security Disclosures regarding Web Storage
Unlike cookies marked with `HttpOnly` flags, items saved in `localStorage` can be read by client-side JavaScript executing in the browser origin context. To mitigate risk:
- All communications are enforced via TLS/HTTPS encryption.
- Tokens carry limited lifetimes and are bound to your user session.
- Users should access Finova on trusted personal devices and maintain updated web browsers.

---

### 3. Managing Web Storage

You can inspect or clear `localStorage` items at any time through your browser's developer tools or settings. Logging out of Finova automatically clears stored authentication tokens from your browser's `localStorage`.
