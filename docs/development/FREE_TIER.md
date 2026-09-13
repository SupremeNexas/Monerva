# Finova Free Tier & Deployment Guide

This document outlines how Finova operates entirely within free tier services, detailing limits, performance details, and configurations to run the service under a **$0 budget**.

## 🏗️ Services Architecture

Finova is deployed using the following free tier services:

| Layer | Provider | Tier | Cost | Limits / Characteristics |
|---|---|---|---|---|
| **Frontend** | Vercel | Hobby | $0 | 100 GB network bandwidth, standard serverless function timeouts. |
| **Backend** | Render | Free Web Service | $0 | 512 MB RAM, shared CPU. Serves spin down after 15 minutes of inactivity (takes ~50 seconds to boot on wake). No persistent local disk. |
| **Database** | Supabase | Free | $0 | 500 MB database size limit, 50,000 monthly active auth users. Inactive databases are paused after 1 week. |
| **AI Subsystem** | Google AI Studio | Free Tier | $0 | standard Gemini 2.5 Flash API rate limits (15 RPM, 1M TPM, 1,500 RPD). |

---

## 🔒 Configuration & Secrets Management

To maintain zero exposure of production secrets, no `.env` or configuration parameters containing keys should ever be committed to the code repository.

Configure the production parameters securely in your dashboards:

### 1. Render Dashboard (Backend)
Add the following environmental variables:
* `DATABASE_URL`: Transaction-pooled connection string from Supabase (Port 6543, e.g., using `pgbouncer=true` parameters).
* `DIRECT_URL`: Direct database connection string from Supabase (Port 5432) required for Prisma migrations.
* `JWT_SECRET`: A high-entropy secure JWT signing secret (minimum 32 characters).
* `CLIENT_URL`: The production URL of your Vercel frontend (e.g. `https://finova.vercel.app`) to handle CORS validations.
* `GEMINI_API_KEY`: API Key from Google AI Studio. If left blank, Finova automatically falls back to an offline rule-based Mock Engine.
* `PORT`: `5002`

### 2. Vercel Console (Frontend)
Vercel environment variables are automatically bundle-time injected:
* `VITE_API_URL`: (Optional) The production URL of your Render backend. If left blank, it defaults to proxying via `/api` (configured in `vercel.json` rewrites rules).
* `VITE_GOOGLE_CLIENT_ID`: The client ID generated for Google Identity Services from the Google Cloud Console.

### 3. Google Cloud Console (OAuth & Google Sign-In)
* Configure **Authorized JavaScript Origins** to exactly include both:
  - Your local workstation dev server: `http://localhost:5173`
  - Your production Vercel frontend domain: `https://your-finova-frontend.vercel.app`

#### Quick Setup for Google Sign-In (GSI)

1. Visit [Google Cloud Console APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials → OAuth client ID**.
3. Choose **Web application**.
4. Enter:
   - **Name**: Finova Web App
   - **Authorized JavaScript origins**: `http://localhost:5173` (and your production Vercel URL)
   - **Authorized redirect URIs**: `http://localhost:5002/api/auth/google/callback` (for local dev only if using traditional OAuth flow)
5. Click **Create** and copy the **Client ID**.
6. In your **Render dashboard**, add the environment variable `GOOGLE_CLIENT_ID` with the value you copied.
7. In your **Vercel dashboard**, add the environment variable `VITE_GOOGLE_CLIENT_ID` with the same value.

---

## ⚡ What Happens When Free Limits are Reached?

### 1. Render Cold Starts
Render's Free Web Service sleeps after 15 minutes of inactivity. The first API request after a sleep period will take about 50 seconds to complete while Render boots the container instance. Subsequent requests will execute instantly.

### 2. Supabase Storage & Data Limits
The database is capped at **500 MB** storage. Inactive projects are paused after 1 week of inactivity (easily resumed via the Supabase dashboard). High volume transactions or uploading massive attachment files (if object storage is enabled) might consume this limit. Finova uses local storage fallback for receipt uploads in the development workspace.

### 3. Gemini Free API Quota
If the free tier traffic exceeds Gemini's rate limits (15 Requests Per Minute):
* The API will return standard rate limit response codes.
* Finova backend catches the exception and **automatically falls back to the Offline Mock Engine**. This keeps the application fully functional, returning mock categorizations, subscription predictions, and insights instead of crashing.

---

## 🛠️ How to Disable or Customize AI Capabilities

AI capabilities are configured dynamically in the backend via environment variables. If you want to disable Gemini API entirely:

1. **Switch to Mock Platform:**
   Remove the `GEMINI_API_KEY` from the Render environment variables, or set `AI_PROVIDER=mock`. Finova will route all insights, transaction categorizations, and chat coaching to the offline mock calculation engine.

2. **Custom Providers:**
   You can also configure `AI_PROVIDER` to `openai` (requires `OPENAI_API_KEY`), `anthropic` (requires `ANTHROPIC_API_KEY`), or `ollama` (local offline provider) in the server environment variables.
