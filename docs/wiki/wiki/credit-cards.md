# Credit Cards
Last Updated: 2026-07-19

This document details the Credit Card models, billing cycles, dues metrics, and front-end charts.

---

## 🗄️ Database Representation
Credit cards are stored in the `CreditCard` model:
```prisma
model CreditCard {
  id                String   @id @default(uuid())
  userId            String   @map("user_id")
  name              String
  limitAmount       Decimal  @map("limit_amount") @db.Decimal(12, 2)
  totalDue          Decimal  @default(0.00) @map("total_due") @db.Decimal(12, 2)
  minimumDue        Decimal  @default(0.00) @map("minimum_due") @db.Decimal(12, 2)
  dueDate           DateTime @map("due_date")
  billingCycleStart Int?     @map("billing_cycle_start")
  billingCycleEnd   Int?     @map("billing_cycle_end")
  // ...
}
```

---

## 💳 Controller API: `backend/src/routes/credit_cards.ts`
* `GET /api/credit_cards` — Fetches cards list mapped by `userId`.
* `POST /api/credit_cards` — Validates inputs (name, limits, cycle offsets, due dates) and creates a new card profile.
* `PUT /api/credit_cards/:id` — Updates due balances.
* `DELETE /api/credit_cards/:id` — Removes card accounts.

---

## ⚠️ Debt Warning Badges
* The frontend `CreditCardsPage.tsx` calculates credit utilization ratios (`totalDue / limitAmount`).
* If utilization exceeds `30%`, the UI displays yellow badges; if it exceeds `70%`, it displays red warning badges to alert users of potential debt risks.

---

## 🔗 Related Resources
* Visit [[wiki/api-reference]] for credit card endpoints.
* Visit [[wiki/database]] for relational maps.
