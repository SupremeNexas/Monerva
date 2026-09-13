# Transactions

Related: [[Dashboard]], [[Budgets]], [[Wallets]], [[Database]]

Tags: #finance #transactions #ledger

Represents expense and income entries logged by the user:
* Scoped strictly by user identifiers in the database.
* Linked to custom or default category entities and specific asset sources (wallets).
* Supports tagging, descriptions, location tagging, and receipt document uploads.
* Supports CSV imports through a frontend preview flow that sends uploaded file text for column mapping and validation.
* Triggers wallet balance modifications on creation, deletion, or modifications.
