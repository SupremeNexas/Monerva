# Developer Onboarding Guide

Welcome to the **antigravity** project! This guide will help you set up your development environment and understand the codebase.

---

## 📂 Project Structure

```text
Expense-Tracker/
├── backend/                   # Node.js Express API Server
│   ├── server.ts              # Server Entrypoint (Port 5002)
│   ├── prisma/                # Prisma ORM Schema & Seed Data
│   └── src/
│       ├── db/                # Global Prisma Client
│       ├── middleware/        # Authentication, Error, and RBAC guards
│       ├── routes/            # API Route Controllers
│       └── services/          # AI providers, exports, automations, converter
├── frontend/                  # Vite React client SPA
│   ├── vite.config.ts         # Vite bundler options (Port 5173)
│   └── src/
│       ├── api/               # API clients forwarding Workspace headers
│       ├── components/        # Layout and UI atomic primitives library
│       └── pages/             # Layout pages (Dashboard, Copilot, Workspace)
```

---

## 🛠️ Step-by-Step Local Setup

### Prerequisite Checklist
*   Node.js (v18 or v20 recommended)
*   PostgreSQL local cluster

### Setup Instructions
1.  **Install dependencies**:
    Run the setup command from the repository root:
    ```bash
    npm run setup
    ```
2.  **Start Database Server**:
    Bootstrap the local Postgres cluster on port `5433`:
    ```bash
    ./run_db.sh start
    ```
3.  **Synchronize Schema & Seed Data**:
    ```bash
    npx prisma db push --schema=backend/prisma/schema.prisma
    npx prisma db seed --schema=backend/prisma/schema.prisma
    ```
4.  **Launch Dev Servers**:
    ```bash
    npm run dev
    ```
    *   Vite Client: [http://localhost:5173](http://localhost:5173)
    *   Express API Server: [http://localhost:5002](http://localhost:5002)
