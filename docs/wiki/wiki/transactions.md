# Transactions Ledger
Last Updated: 2026-07-19

This document details the transaction models, filters, sorting criteria, and export systems.

---

## 🗄️ Database Representation
Transactions are stored in the `Transaction` table (`schema.prisma`):
```prisma
model Transaction {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  title         String
  amount        Decimal  @db.Decimal(12, 2)
  type          String   @default("EXPENSE") // EXPENSE, INCOME
  categoryId    String   @map("category_id")
  walletId      String   @map("wallet_id")
  paymentMethod String?  @map("payment_method")
  tags          String[]
  notes         String?
  receiptUrl    String?  @map("receipt_url")
  date          DateTime
  isRecurring   Boolean  @default(false) @map("is_recurring")
  // ...
}
```

---

## 💻 CRUD Controllers: `backend/src/routes/expenses.ts`
1. **Fetch (`GET /api/expenses`)**: Retrieves the ledger. Searches in titles, notes, and tag arrays. Filters by category and date ranges. Returns transactions sorted by `date`, `amount`, or `category`.
2. **Create (`POST /api/expenses`)**: Logs a transaction. Resolves the selected wallet and adjusts its balance.
3. **Update (`PUT /api/expenses/:id`)**: Reverts the old transaction amount from the previous wallet, queries the new wallet, applies the new transaction amount, and updates the record.
4. **Delete (`DELETE /api/expenses/:id`)**: Reverts the wallet balance and deletes the record.

---

## 📋 CSV Exports & Table Filters
* **Search Filters**: The frontend `ExpensesPage.tsx` table allows text search across fields, filters by category, and filters by month/year.
* **CSV Export**: Compiles transaction arrays and generates custom CSV files directly on the client side (`nprogress` / download triggers) for user downloads.
* **CSV Import**: `CSVImportModal.tsx` reads uploaded files as text before sending preview payloads to the backend import parser.

---

## 🔗 Related Resources
* Visit [[wiki/wallets]] for balance modifications details.
* Visit [[wiki/database]] for relational maps.
