# Product Roadmap
Last Updated: 2026-07-19

This document outlines the planned feature releases, optimization goals, and integrations.

---

## 🎯 Short-Term Priorities (v1.1.0)
1. **Fix Missing Wallet Endpoint**: Implement `/api/expenses/wallets` in the backend so the frontend form fetches the user's active wallets.
2. **Enhanced Security Scoping Review**: Run queries audits across all backend routers to verify scoping scoping bounds.
3. **Receipt Scan Items Breakdown**: Auto-create splits or separate transactions from receipt line items.

---

## 📅 Medium-Term Milestones (v1.2.0)
1. **Multi-Currency Converter**: Integrate a live currency exchange API, letting users view balances in USD, EUR, INR, or other local selections.
2. **Plaid Sync Endpoints**: Develop mock banking connectors that simulate downloading bank statements and sync balances.
3. **Advanced Charts & Dark Mode**: Add custom Recharts configurations supporting HSL variables for dark mode charting.

---

## 🚀 Long-Term Vision (v2.0.0)
1. **AI Predictive Analytics**: Implement cash flow forecasting based on historical transaction logs.
2. **Automated Bill Payments**: Remind users of recurring subscriptions and prompt automated payments.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for immediate priorities.
* Visit [[wiki/changelog]] for version histories.
