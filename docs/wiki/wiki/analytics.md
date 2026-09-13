# Analytics Wiki
Last Updated: 2026-07-05

This document details statistical calculations, chart configurations, and metrics aggregators.

---

## 📊 Performance Statistics & Aggregates

### 1. Cumulative Monthly Spending Trend
* **Route**: `/api/analytics/monthly`
* **Query**: Aggregates all transaction entries scoped by `type: 'EXPENSE'` inside a target month.
* **Return Layout**:
  ```json
  [
    { "date": "2026-07-01", "amount": 120.50 },
    { "date": "2026-07-02", "amount": 45.00 }
  ]
  ```

### 2. Category Distribution Share
* **Route**: `/api/analytics/category`
* **Query**: Groups expenses by category and returns sums mapped as percentages, feeding into Recharts pie widgets on the frontend dashboard.

### 3. Net Worth Calculation
* Computes sum of income transactions minus sum of expense transactions, offset by wallet balances.

---

## 🔗 Related Resources
* Read [[CODEX.md]] for standards.
* Read [[CLAUDE.md]] for commands.
