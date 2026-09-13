# Contributing Guidelines

Thank you for your interest in contributing to **Monerva**! We welcome contributions from developers of all skill levels.

---

## 🚀 Setting Up Your Workspace

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/your-username/Expense-Tracker.git
   cd Expense-Tracker
   ```
2. **One-Command Setup**:
   Install client and server dependencies using the root shortcut script:
   ```bash
   npm run setup
   ```
3. **Database Configuration**:
   * Verify Docker/local PostgreSQL is installed.
   * Start local Postgres database on port `5433`:
     ```bash
     ./run_db.sh start
     ```
   * Push Prisma schema migrations and run the seeding script:
     ```bash
     npx prisma db push --schema=backend/prisma/schema.prisma
     npx prisma db seed --schema=backend/prisma/schema.prisma
     ```
4. **Run Development Mode**:
   * Start Vite client and Express server:
     ```bash
     npm run dev
     ```

---

## 📝 Git Workflow & Conventions

### Branch Naming Conventions
*   `feat/` for new features (e.g. `feat/plaid-integration`)
*   `fix/` for bug fixes (e.g. `fix/refresh-token-expiry`)
*   `docs/` for documentation (e.g. `docs/api-guide`)
*   `refactor/` for code refactoring (e.g. `refactor/validation-helpers`)

### Commit Message Conventions
We follow the conventional commits format:
*   `feat(scope): Description of the new feature`
*   `fix(scope): Description of the bug fix`
*   `docs(scope): Documentation changes only`
*   `style(scope): Formatting, missing semi-colons, etc.`

---

## 🛡️ Security Scoping Guidelines

Every database query or transaction MUST enforce strict ownership rules:
*   Scope database actions using the workspace context: `workspaceId: req.workspaceId`.
*   Ensure the authenticated user is the actor: `userId: req.user.id`.
*   Avoid global queries that return values without this constraint.

---

## 🧪 Testing Guidelines

Before opening a pull request, verify that:
1. All TypeScript files compile without errors: `npm run typecheck`.
2. Frontend Vite build is successful: `npm run build`.
