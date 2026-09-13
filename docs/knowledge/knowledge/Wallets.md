# Wallets

Related: [[Transactions]], [[Budgets]], [[Database]]

Tags: #wallets #banking #accounts

Represents asset channels (Cash, Bank account balance sheets, UPI wallets, Credit accounts):
* Tracks active balances dynamically as transactions are logged or changed.
* Mapped inside the PostgreSQL database using high-precision Decimal types.
* *Open Issue*: The backend endpoint `/api/expenses/wallets` is currently missing, causing frontend forms to fall back on static client selections.
