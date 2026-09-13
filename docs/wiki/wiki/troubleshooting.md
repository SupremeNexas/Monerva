# Troubleshooting & Diagnostics
Last Updated: 2026-07-19

This document details common developer configuration errors, database lock issues, and server diagnostics.

---

## ❌ Server Start Failures

### 1. Address In Use (`EADDRINUSE`) on Port 5000
* **Cause**: macOS AirPlay Receiver or Control Center services listen on port `5000` by default.
* **Fix**: The application port has been shifted to `5002`. Ensure your frontend environment refers to `VITE_API_URL="http://localhost:5002"`. If you must run on `5000`, turn off AirPlay Receiver in system settings.

### 2. Database Connection Refused
* **Cause**: PostgreSQL is not active, or is listening on the default port `5432` instead of `5433`.
* **Fix**: Start the local database cluster container:
  ```bash
  ./run_db.sh start
  ```
  Check that the connection string in `backend/.env` is set to `DATABASE_URL="postgresql://postgres@localhost:5433/expense_tracker?schema=public"`.

---

## 🔑 Authentication Gaps

### 1. Google GSI popup "Developer Configuration Error"
* **Cause**: Mismatch between the host URL (`http://localhost:5173`) and the authorized origins configured in Google Cloud Console, or incorrect client IDs.
* **Fix**: Verify your client ID matches exactly in both `backend/.env` (`GOOGLE_CLIENT_ID`) and `frontend/.env` (`VITE_VITE_GOOGLE_CLIENT_ID`). Ensure `http://localhost:5173` is listed under Authorized JavaScript Origins.

---

## 🤖 Gemini API Scan Failures

### 1. Receipt Scanner falls back to Simulated Data
* **Cause**: Missing or empty `GEMINI_API_KEY` inside `backend/.env`.
* **Fix**: Acquire an API key from Google AI Studio and configure:
  ```env
  GEMINI_API_KEY="your_api_key"
  ```
  Restart the Express backend server.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for startup commands.
* Read [[CODEX.md]] for env configurations.
