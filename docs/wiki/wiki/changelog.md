# Changelog
Last Updated: 2026-07-19

This log tracks version changes, database migrations, and major feature updates.

---

## [1.0.0] - 2026-07-05
Initial system release migrating from prototype architectures.

### Added
* **PostgreSQL Integration**: Local DB running on port `5433` (socket `/tmp`) utilizing Prisma Client models.
* **Express Router Framework**: Modular REST routers for User registers, expenses CRUD, budgets, goals, credit cards, bills, and subscriptions.
* **JWT Refresh Rotation**: Short session tokens paired with 7-day localStorage refresh tokens.
* **Google OAuth**: Verified token validations on `/api/auth/google` with Google Identity Services.
* **Gemini AI Vision OCR**: Multi-modal receipt scans via `gemini-2.5-flash` client integrations.
* **Zustand State Store**: Client session status and login flags mapping.
* **React 19 Frontend**: Vite-powered client layout featuring Apple/Notion-inspired spring cards.

---

## [0.1.0] - 2026-06-15
Initial proof of concept prototype.
* SQLite database file storage.
* Basic email auth without password salting.
* Static mock components.

---

## 🔗 Related Resources
* Visit [[wiki/roadmap]] for future features.
