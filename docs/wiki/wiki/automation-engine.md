# Automation Engine Wiki

Last Updated: 2026-07-19

This wiki page outlines the triggers, conditions, actions, and background scheduling capabilities of our rule-based automation engine.

---

## 🤖 Engine Lifecycle (`engine.ts`)

The automation engine executes rules configured inside a workspace immediately following resource mutations. The main runner is located at [engine.ts](file:///Users/supryo/Desktop/Expense-Tracker/backend/src/services/automation/engine.ts).

### Triggers & Actions Flow
```text
Transaction Logged --> [Evaluate Conditions] --> [Execute Actions List]
                                                      ↓
                                            Tag, Notify, Save, Recur
```

### Supported Triggers
1.  **`TRANSACTION_CREATED`**: Fired when a transaction is logged (via OCR scan or CRUD modals).
2.  **`BUDGET_OVERRUN`**: Fired when a transaction causes a category budget cap breach.
3.  **`GOAL_COMPLETED`**: Fired when savings contributions reach target amounts.

---

## 📝 Rule Configurations

Rules are stored in JSON schemas inside the `Automation` table:

```json
{
  "name": "Auto Tag Fuel Charges",
  "triggerType": "TRANSACTION_CREATED",
  "conditions": {
    "category": "Fuel",
    "amountGreaterThan": 1000
  },
  "actions": [
    {
      "type": "TAG_TRANSACTION",
      "value": "Vehicle"
    }
  ]
}
```

### Supported Actions
*   **`TAG_TRANSACTION`**: Appends specific strings to the transaction's tag array.
*   **`SEND_NOTIFICATION`**: Inserts a workspace alert notification record.
*   **`ALLOCATE_SAVINGS`**: Automatically diverts a configured percentage of incoming salary/income payments to active savings goals.

---

## ⏰ Background Scheduled Jobs (`scheduler.ts`)

Background cron-equivalent tasks are handled inside [scheduler.ts](file:///Users/supryo/Desktop/Expense-Tracker/backend/src/services/jobs/scheduler.ts):
*   **Budget Rollover**: Resets monthly budget startDate/endDate on the 1st of the month.
*   **Subscription Processing**: Auto-debits balances and generates transaction logs for subscriptions reaching their due date.

---

## 🔗 Related Resources
*   Read [[wiki/workspaces]] for access rules.
*   Read [[wiki/database]] for Prisma schemas.
