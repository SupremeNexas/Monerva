# Authentication Wiki
Last Updated: 2026-07-05

This document details the security layers, password management, and authorization flows — including the fully-implemented Google OAuth 2.0 integration.

---

## 🔒 Security Lifecycle

### 1. Email/Password Registration
* Passes incoming passwords through `bcryptjs.hash()` using `10` salt rounds.
* Encrypts and persists credentials in the `User` table (`password_hash` column).
* `authProvider` field set to `"email"`.

### 2. Google OAuth 2.0 (Google Identity Services)
* Frontend loads Google Identity Services (GSI) SDK via `https://accounts.google.com/gsi/client` in `index.html`.
* On button click, `google.accounts.id.prompt()` opens the official Google account picker popup.
* Google returns a **credential (ID Token)** — a signed JWT containing verified Google profile data.
* Frontend sends **only the raw ID token** to `POST /api/auth/google` — no profile data is sent directly.
* **Backend verifies** the ID token using `google-auth-library`'s `OAuth2Client.verifyIdToken()` against the configured `GOOGLE_CLIENT_ID`.
* After verification, backend extracts `{ sub (googleId), email, name, picture, email_verified }` from the verified payload.
* Backend finds or creates the user by matching `googleId` or `email`.
* `authProvider` is set to `"google"`. `avatar` is stored from Google's `picture` field.
* New users get default categories and sample data seeded automatically.

### 3. JWT Access Tokens
* Generated during `/api/auth/login` and `/api/auth/google` containing the payload `{ id: user.id, email: user.email }`.
* Signed using `JWT_SECRET` from environment.
* Expires in **15 minutes**.
* Validated on protected endpoints via the `authenticate` middleware in `backend/src/middleware/auth.ts`.

### 4. Silent Refresh Token Rotation
* Long-lived refresh tokens (7-day expiry) are stored in `localStorage` as `fintech_refresh_token`.
* On `checkAuth()`, if the access token is expired, the Zustand store automatically exchanges the refresh token at `POST /api/auth/refresh` for fresh tokens.
* Sessions persist across browser refreshes without requiring re-login.

### 5. Logout
* Clears `fintech_token` and `fintech_refresh_token` from localStorage.
* Calls `google.accounts.id.disableAutoSelect()` to ensure Google account picker re-appears on next login.
* Zustand user state is reset to `null`.

---

## 🌐 Google Cloud Console Setup

Required configuration for Google OAuth to function:

```
Authorized JavaScript Origins: http://localhost:5173
Authorized Redirect URIs:      http://localhost:5002/api/auth/google/callback
```

Required environment variables:

### Backend (`backend/.env`)
```env
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
CLIENT_URL="http://localhost:5173"
JWT_SECRET="your_jwt_secret"
```

### Frontend (`frontend/.env`)
```env
VITE_GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
VITE_API_URL="http://localhost:5002"
```

> ⚠️ If `VITE_GOOGLE_CLIENT_ID` is empty, the Google Sign-In button displays a configuration warning banner on the auth page.
> ⚠️ If `GOOGLE_CLIENT_ID` is empty, the backend `/api/auth/google` returns `503 Service Unavailable`.

---

## 🗄️ Database Schema (User Model — OAuth Fields)

| Field         | Type      | Description                              |
|---------------|-----------|------------------------------------------|
| `googleId`    | `String?` | Unique Google user sub ID (`@unique`)    |
| `avatar`      | `String?` | Profile picture URL from Google          |
| `authProvider`| `String`  | `"email"` or `"google"` (default: email) |
| `lastLogin`   | `DateTime?` | Timestamp of most recent successful login |
| `passwordHash`| `String?` | `null` for Google-only users             |

---

## 🔧 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `GOOGLE_CLIENT_ID is not configured` | Backend `.env` missing `GOOGLE_CLIENT_ID` | Add the value from Google Cloud Console |
| `Google Sign-In failed to load` | GSI script not loading | Check internet connection; script is in `index.html` |
| `Popup blocked` | Browser blocking popups | Allow popups for `localhost:5173` in browser settings |
| `Token used too late` | Clock skew or cached old token | Refresh the page and try again |
| `Wrong number of segments` | Client sent garbage instead of a real ID token | Ensure GSI is initialized correctly |
| `This account uses Google Sign-In` | User trying email login for Google-only account | Use the Google button instead |

---

## 🔗 Related Resources
* Read [[CODEX.md]] for standards.
* Read [[CLAUDE.md]] for commands.
* Visit [[wiki/database]] for Prisma schemas.
