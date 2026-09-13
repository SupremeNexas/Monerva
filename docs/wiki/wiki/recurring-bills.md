# Recurring Bills & Subscriptions
Last Updated: 2026-07-19

This document details the recurring obligations models, calendar timelines, and monthly burn calculations.

---

## 🗄️ Database Representation
Obligations are managed using two separate models in `schema.prisma`:
```prisma
model Bill {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  amount    Decimal  @db.Decimal(12, 2)
  dueDate   DateTime @map("due_date")
  isPaid    Boolean  @default(false) @map("is_paid")
  category  String
  // ...
}

model Subscription {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  name            String
  amount          Decimal  @db.Decimal(12, 2)
  billingCycle    String   @default("MONTHLY") @map("billing_cycle") // MONTHLY, YEARLY
  nextBillingDate DateTime @map("next_billing_date")
  isActive        Boolean  @default(true) @map("is_active")
  // ...
}
```

---

## 📊 Monthly Burn Calculations
* **Endpoint**: `GET /api/subscriptions`
* **Calculation**:
  - Aggregates active subscriptions (`isActive: true`).
  - Normalizes amounts to a monthly scale (yearly rates are divided by `12`).
  - Returns total monthly recurring costs (e.g. Netflix, Spotify, AWS) to render the "Monthly Burn Rate" gauge on the dashboard.

---

## 📅 Bills Obligation Calendar
* The frontend `BillsPage.tsx` compiles bill items into a calendar grid.
* Paid indicators (`isPaid`) allow users to toggle completion.
* Unpaid bills approaching their due date trigger alerts.

---

## 🔗 Related Resources
* Visit [[wiki/api-reference]] for endpoints detail.
* Visit [[wiki/database]] for schemas.
