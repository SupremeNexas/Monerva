# Workspaces & RBAC Wiki

Last Updated: 2026-07-19

This wiki page outlines the multi-tenant architecture, role permission tiers, and collaborative ledger systems in the Expense Tracker.

---

## 🏢 Workspace Architecture

To transition the app from a single-user system into a collaborative platform, we introduced the concept of **Workspaces**.

*   **Scoping Header (`x-workspace-id`)**: All API calls from the React client automatically forward the active workspace ID.
*   **Personal Workspace Fallback**: If the header is missing, the backend dynamically resolves the user's default Personal Workspace. This preserves 100% backward compatibility.
*   **Database Tables**: Linked through relations inside [schema.prisma](file:///Users/supryo/Desktop/Expense-Tracker/backend/prisma/schema.prisma):
    - `Workspace`: Holds Name, Type (PERSONAL, FAMILY, BUSINESS, PROJECT).
    - `WorkspaceMember`: Join table linking `User` and `Workspace` with associated role.

---

## 🔒 Role-Based Access Control (RBAC)

Workspace resources are protected using the `requireWorkspaceRole` middleware inside [rbac.ts](file:///Users/supryo/Desktop/Expense-Tracker/backend/src/middleware/rbac.ts).

### Permissions Tiers

| Role | Operations | Actions Allowed |
| :--- | :--- | :--- |
| **OWNER** | Full control | Read/write data, manage invites, modify roles, delete workspace |
| **ADMIN** | Administrative control | Read/write data, manage invites, modify roles |
| **EDITOR** | Read/write | Log transactions, create budgets, manage rules |
| **VIEWER** | Read-only | Read history logs, export CSV reports, view analytics summary |

---

## 🤝 Shared Budgets & Wallets

*   **Shared Wallets**: Multiple users can create and edit transactions inside a shared wallet. Transactions record the `userId` (creator) and `lastEditorId`.
*   **Shared Budgets**: Displays spent aggregates of all transactions inside the workspace. Details contribution lists (total amounts logged) per member.

---

## 🔗 Related Resources
*   Read [[wiki/backend]] for router setups.
*   Read [[wiki/automation-engine]] for rule controls.
