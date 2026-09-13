# AGENTS.md

This document defines the behavioral conventions, execution workflows, and review checklists for AI coding assistants (e.g. Antigravity, Claude Code, Cursor) collaborating on this codebase.

---

## 🚀 Session Initialization Sequence
Every AI session must start by reading the following index files before writing code:
```text
1. Read [[CLAUDE.md]]       # Command references & layouts
2. Read [[CODEX.md]]        # Code standards & systems
3. Read [[AGENTS.md]]       # This rules file
4. Read `memory/current-status.md` & `current-priorities.md`
5. Load only the specific, related wiki page (e.g. `wiki/database.md`)
6. Read the relevant Obsidian notes from `knowledge/`
```

---

## 🎯 Task Decomposition
* Break down complex user requests into discrete, modular tasks.
* Before execution, list outstanding changes inside the `task.md` checklist in the artifacts directory.
* Run tasks sequentially, marking progress (`[ ]` to `[/]` to `[x]`) after completing each section.

---

## 🔍 Context Loading Strategy (Avoid Overload)
To prevent token bloat and context confusion, **do not load the entire repository**. Instead, determine which subsystem you are modifying and load only the required files.

* **Authentication changes**: Load `CLAUDE.md`, `CODEX.md`, `wiki/authentication.md`, `knowledge/Authentication.md` and `memory/current-status.md`.
* **Database changes**: Load `CLAUDE.md`, `CODEX.md`, `wiki/database.md`, `knowledge/Database.md` and `memory/current-status.md`.
* **Analytics/Dashboard changes**: Load `CLAUDE.md`, `wiki/analytics.md`, `knowledge/Analytics.md`, `knowledge/Dashboard.md` and `memory/current-status.md`.
* **AI Feature changes**: Load `CLAUDE.md`, `wiki/ai.md`, `knowledge/API.md`, and `memory/current-status.md`.
* **Transaction/Wallet changes**: Load `CLAUDE.md`, `wiki/transactions.md`, `wiki/wallets.md`, `knowledge/Transactions.md`, `knowledge/Wallets.md` and `memory/current-status.md`.

---

## 📝 Commit & Git Conventions
We follow the conventional commit specification for all repository commits.
* **Format**: `<type>(<scope>): <short description>`
* **Types**:
  * `feat`: A new feature implementation (e.g. `feat(ai): integrate gemini receipt scanner`)
  * `fix`: A bug fix (e.g. `fix(auth): solve refresh token expiration fallback`)
  * `docs`: Documentation updates only (e.g. `docs(wiki): record analytics schema details`)
  * `style`: Styling changes that do not affect code logic (e.g. `style(css): adjust button corner radius`)
  * `refactor`: Code changes that neither fix bugs nor add features (e.g. `refactor(routes): cast parameters`)
  * `chore`: Maintenance tasks (e.g. `chore(deps): update prisma client`)

---

## 🔍 Code Review & Refactoring Checklist
Before ending a session or proposing a pull request, run this checklist:
* [ ] **Compilation**: Run compiler checks (`tsc --noEmit` inside `frontend/` and Vite `npm run build`) to ensure `0` errors.
* [ ] **Preserve Comments**: Keep existing comments, notes, and JSDoc strings intact unless explicitly asked to modify them.
* [ ] **Strict scoping**: Verify all database calls scope records by `userId: req.user.id`.
* [ ] **Error Handling**: Wrap controller queries in standard `try-catch` structures with proper status returns.
* [ ] **Documentation Update**: Sync changes to `/memory/completed-features.md`, `/memory/current-status.md`, and the wiki.

---

## 🛠️ Refactoring Rules
* **No Monoliths**: Keep code modular. Do not expand files past 500 lines. Split UI visual assets, validation parameters, hooks, and helpers into logical subfiles.
* **No Code Duplication**: Extract shared logic (e.g. currency formatting, date parsers, wallet balance calculations) into helper files inside `utils/` or `services/`.
* **Type Safety**: Maintain strict type definitions. Do not bypass TypeScript compiler warnings using standard `any` cast shortcuts (except where Prisma relational queries obfuscate models).

---

## 📚 Documentation Update Rules
* Every code modification that impacts functionality, endpoint schemas, database relations, UI styling properties, or CLI commands must be updated across all 3 documentation layers:
  1. **LLM Wiki**: Reflect technical changes in the corresponding `/wiki/*.md` file.
  2. **Obsidian Brain**: Sync connections and backlinks in `/knowledge/*.md`.
  3. **Memory Layer**: Log status, features completed, and priorities inside `/memory/`.

---

## 🧪 Testing Expectations
* Test features using local environment parameters.
* Always seeding the DB via `npx prisma db seed` to confirm database migrations do not break sample logins.
* Verify form validation alerts, dashboard animations, and OCR Vision API mock fallbacks execute properly in front of Vite.

---

## 🧹 Release Hygiene
* Update version changes in `/memory/release-notes.md`.
* Ensure environment configurations are documented clearly in `/wiki/deployment.md`.
* Clean up built assets and compiled `.js` files before pushing to remote branches.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for commands and structures.
* Read [[CODEX.md]] for system manuals.
