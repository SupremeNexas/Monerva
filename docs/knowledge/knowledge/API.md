# API

Related: [[Backend]], [[Authentication]], [[Database]]

Tags: #endpoints #express #rest

The Express REST API server:
* Mounted under `/api` and listens on Port `5002`.
* Exposes modules for auth, expenses, categories, budgets, cards, bills, goals, groups, and AI vision scanning.
* Validates inputs via `express-validator` middleware.
