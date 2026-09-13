# REST API Reference
Last Updated: 2026-07-19

This document details all restful HTTP endpoints exposed under `/api` by the Node.js Express server.

---

## 🔒 Base Configurations
* **Base Endpoint URL**: `http://localhost:5002/api`
* **Common Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <JWT_token>` (for all protected routes)

---

## 🔑 Authentication Endpoints (`/api/auth`)

### 1. `POST /api/auth/register`
Creates a new email-based user profile. Seeding triggers default categories.
* **Request**: `{ "name": "Name", "email": "email@example.com", "password": "password" }`
* **Response (201)**: `{ "id": "uuid", "name": "Name", "email": "email@example.com", "token": "jwt_token" }`

### 2. `POST /api/auth/login`
Authenticates a user via email and password.
* **Request**: `{ "email": "email@example.com", "password": "password" }`
* **Response (200)**: `{ "id": "uuid", "name": "Name", "email": "email@example.com", "token": "jwt_token", "refreshToken": "refresh_token" }`

### 3. `POST /api/auth/google`
Authenticates a user using Google Identity Services credential token.
* **Request**: `{ "idToken": "google_gsi_id_token" }`
* **Response (200)**: `{ "id": "uuid", "name": "Google Name", "email": "google@gmail.com", "token": "jwt_token", "refreshToken": "refresh_token" }`

### 4. `POST /api/auth/refresh`
Rotates the session. Exchange a long-lived refresh token for a fresh JWT.
* **Request**: `{ "refreshToken": "current_refresh_token" }`
* **Response (200)**: `{ "token": "new_jwt_token", "refreshToken": "new_refresh_token" }`

---

## 💸 Expenses/Transactions Endpoints (`/api/expenses`)

### 1. `GET /api/expenses`
Retrieves filtered list of user expenses.
* **Query Parameters**: `month` (1-12), `year` (YYYY), `category_id`, `search`, `sort` (`date` | `amount` | `category`), `order` (`asc` | `desc`).
* **Response**: `[ { "id": "uuid", "title": "Uber", "amount": 450, "type": "EXPENSE", "category_name": "Travel", "date": "2026-07-19" } ]`

### 2. `POST /api/expenses`
Creates a transaction and adapts the selected Wallet balance accordingly.
* **Request**: `{ "title": "Lunch", "amount": 12.50, "category_id": "uuid", "date": "2026-07-19", "payment_method": "Cash", "wallet_id": "uuid", "type": "EXPENSE" }`
* **Response (201)**: Created Transaction model.

### 3. `PUT /api/expenses/:id`
Updates transaction properties and adjusts old/new Wallet balances.

### 4. `DELETE /api/expenses/:id`
Removes transaction and reverts the Wallet balance adjustment.

---

## 🎨 Category Endpoints (`/api/categories`)
* `GET /api/categories` — Retrieves list of default and custom user categories.
* `POST /api/categories` — Creates custom user category.
* `PUT /api/categories/:id` — Modifies category fields (name, color, icon).
* `DELETE /api/categories/:id` — Deletes category (blocked if transactions/budgets reference it).

---

## 📊 Budgets Endpoints (`/api/budgets`)
* `GET /api/budgets` — Retrieves active category budgets list.
* `POST /api/budgets` — Sets category spent limit.
* `DELETE /api/budgets/:id` — Removes budget cap.

---

## 💳 Credit Cards Endpoints (`/api/credit_cards`)
* `GET /api/credit_cards` — Retrieves limits and due logs.
* `POST /api/credit_cards` — Sets limit cards.
* `PUT /api/credit_cards/:id` — Modifies balance metrics.
* `DELETE /api/credit_cards/:id` — Deletes card account.

---

## 📅 Bills & Subscriptions Endpoints (`/api/bills` & `/api/subscriptions`)
* `GET /api/bills` — Retrieves obligations calendar.
* `POST /api/bills` — Creates calendar obligations.
* `GET /api/subscriptions` — Retrieves subscriptions burn.
* `POST /api/subscriptions` — Registers service subscriptions.

---

## 🎯 Savings Goals Endpoints (`/api/goals`)
* `GET /api/goals` — Retrieves savings targets and achievements.
* `POST /api/goals` — Creates saving milestone.
* `POST /api/goals/:id/contribute` — Logs saving logs.

---

## 👥 Expense Group Endpoints (`/api/groups`)
* `GET /api/groups` — Retrieves user groups.
* `POST /api/groups` — Initiates ledger group.
* `GET /api/groups/:id` — Retrieves group members, expense splits, and settlement matrix.
* `POST /api/groups/:id/expenses` — Logs shared group expense.
* `POST /api/groups/:id/settlements` — Resolves split balances.

---

## 🤖 AI Endpoints (`/api/ai`)
* `POST /api/ai/scan-receipt` — Accepts image binary, outputs OCR scanned values (merchant, amount, tax, date, items, confidence).
* `POST /api/ai/chat` — Accepts messages history, returns contextual assistant insights loaded with user balances.

---

## 📈 Analytics Endpoints (`/api/analytics`)
* `GET /api/analytics/summary` — Retrieves totals (Incomes, Expenses, Net Worth).
* `GET /api/analytics/by-category` — Groups spent ratios for dashboard charts.
* `GET /api/analytics/trend` — Spent timelines trends.
* `GET /api/analytics/budget-status` — Budgets status comparison checks.

---

## 🔗 Related Resources
* Visit [[wiki/backend]] for controller files.
* Visit [[wiki/authentication]] for headers parsing.
