# Budgets Management
Last Updated: 2026-07-19

This document details the budget caps, database models, spent calculations, and frontend alerts.

---

## 🗄️ Database Representation
The `Budget` model in `schema.prisma` tracks spending thresholds:
```prisma
model Budget {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  categoryId String   @map("category_id")
  amount     Decimal  @db.Decimal(12, 2)
  period     String   @default("MONTHLY") // WEEKLY, MONTHLY
  startDate  DateTime @map("start_date")
  endDate    DateTime @map("end_date")
  // ...
}
```

---

## 📊 Spending Aggregation Logic
* **Backend Endpoint**: `GET /api/analytics/budget-status`
* **Query Flow**:
  1. Retrieves all active `Budget` definitions for the authenticated user.
  2. For each budget, aggregates transaction amounts (`type: 'EXPENSE'`) referencing `categoryId` where `date` is between `startDate` and `endDate`.
  3. Returns a structured JSON model comparing limits to active spent totals:
     ```json
     [
       {
         "id": "budget_uuid",
         "categoryId": "category_uuid",
         "categoryName": "Food",
         "limit": 500,
         "spent": 420.50,
         "percentage": 84.1
       }
     ]
     ```

---

## 🎨 UI Alerts & Meters
* **Dashboard Spend Rings**: React dashboard renders budget rings. As the spent percentage approaches `100%`, color properties transition to warning modes (using Ruby styles).
* **AI Coach Check**: The Advisor Coach loads this percentage array on startup to notify users when caps are crossed (e.g. "Alert: You have spent 95% of your Shopping budget limit!").

---

## 🔗 Related Resources
* Visit [[wiki/database]] for database schema details.
* Visit [[wiki/api-reference]] for budgets endpoints.
