# Wallets & Accounts
Last Updated: 2026-07-19

This document details the wallet models, balance modifications, and open backend router gaps.

---

## 🗄️ Database Representation
Wallets are represented in the `Wallet` model:
```prisma
model Wallet {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  type      String   // CASH, BANK, CREDIT_CARD, UPI, OTHER
  balance   Decimal  @default(0.00) @db.Decimal(12, 2)
  color     String   @default("#000000")
  // ...
}
```

---

## 🔄 Balance Adjustments Flow
Whenever a transaction (expense/income) is processed, the backend router automatically adjusts the balance:
1. **Expenses**: Decrements the amount from the target wallet (`balance: { increment: -amount }`).
2. **Incomes**: Increments the amount (`balance: { increment: amount }`).
3. **Deletions / Updates**: The previous transaction amount is reverted (multiplied by `-1` based on type) before the new transaction value is applied.

---

## ⚠️ Known Issues: Missing GET Router
> [!WARNING]
> **Endpoint `/api/expenses/wallets` is missing**:
> The frontend component `ExpenseForm.tsx` performs a query to `/expenses/wallets` to render the user's available wallets.
> However, the backend router `backend/src/routes/expenses.ts` lacks this endpoint, causing a `404 Not Found` error.
> - **Workaround**: Currently falls back to default values mapped in the form dropdowns, or users must select from static list maps.
> - **Fix Action**: A router update is required to resolve this:
>   ```typescript
>   router.get('/wallets', authenticate, async (req, res) => {
>     const wallets = await prisma.wallet.findMany({ where: { userId: req.user.id } });
>     res.json(wallets);
>   });
>   ```

---

## 🔗 Related Resources
* Visit [[wiki/transactions]] for transaction logs.
* Visit [[wiki/database]] for schema definitions.
