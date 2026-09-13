# Finova Cookie & Local Storage Policy

**Last Revised:** September 2026  
**Version:** 1.0  
**Operator:** Finova Systems

---

## 1. Essential Storage Only
Finova uses local web storage strictly for authentication token management, workspace preference selection, and user UI state. We do **NOT** use third-party tracking cookies or advertising cookies.

---

## 2. What Storage Technologies We Use
Finova utilizes browser `localStorage` and HTTP-only session cookies to maintain your login session across page refreshes and secure API transactions.

---

## 3. Inventory of Local Storage Keys
- `finova_token` / `auth_token`: JWT authentication token for API access.
- `finova_user`: Cached user profile JSON object.
- `finova_workspace_id`: Currently selected active workspace ID.
- `theme_preference`: UI color theme selection (light/dark mode).
