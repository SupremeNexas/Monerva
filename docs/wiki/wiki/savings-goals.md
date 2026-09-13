# Savings Goals
Last Updated: 2026-07-19

This document details the savings targets models, log systems, and percentage trackers.

---

## 🗄️ Database Representation
Goals and their respective deposits are managed via a one-to-many relationship:
```prisma
model Goal {
  id            String             @id @default(uuid())
  userId        String             @map("user_id")
  name          String
  targetAmount  Decimal            @map("target_amount") @db.Decimal(12, 2)
  currentAmount Decimal            @default(0.00) @map("current_amount") @db.Decimal(12, 2)
  targetDate    DateTime?          @map("target_date")
  contributions GoalContribution[]
}

model GoalContribution {
  id        String   @id @default(uuid())
  goalId    String   @map("goal_id")
  amount    Decimal  @db.Decimal(12, 2)
  date      DateTime @default(now())
  notes     String?
}
```

---

## 📈 Milestone Progress Calculations
* **Goal Progress Ratio**: Calculated as `(currentAmount / targetAmount) * 100`.
* **Deposit Allocations**:
  - When a user logs a contribution (`POST /api/goals/:id/contribute`), the backend creates a `GoalContribution` record and increments the goal's `currentAmount` (`currentAmount: { increment: amount }`).
  - Progress gauges render dynamic indicators based on these metrics.

---

## 🔗 Related Resources
* Visit [[wiki/api-reference]] for goals endpoints.
* Visit [[wiki/database]] for schemas.
