# Architecture & Sequence Diagrams

Last Updated: 2026-07-19

This wiki page contains Mermaid diagrams visualizing request flows, security scoping rules, and database entity relationships (ER).

---

## 🔒 Request Authentication & Scoping Flow

This sequence diagram details how incoming frontend requests are authenticated and scoped to workspaces using tokens and custom headers.

```mermaid
sequenceDiagram
    autonumber
    actor User as React Client
    participant API as Express Server
    participant Auth as Auth Middleware
    participant RBAC as RBAC Middleware
    participant DB as Postgres DB

    User->>API: HTTP Request (Headers: Authorization, x-workspace-id)
    API->>Auth: Decodes JWT Bearer Token
    alt Token Invalid
        Auth-->>User: 401 Unauthorized
    else Token Valid
        Auth->>RBAC: Decodes req.user.id
        RBAC->>DB: Check User Workspace Member Role
        alt Role Missing/Insufficient
            RBAC-->>User: 403 Forbidden
        else Role Authorized
            RBAC->>API: Binds req.workspaceId
            API->>DB: Scoped Prisma DB Query (where: { workspaceId })
            DB-->>API: Data Payload
            API-->>User: 200 OK (JSON response)
        end
    end
```

---

## 💾 Database Entity-Relationship (ER) Model

This diagram models the key relationships between Users, Workspaces, Transactions, Wallets, and Automations.

```mermaid
erDiagram
    USERS ||--o{ WORKSPACE_MEMBERS : belongs
    WORKSPACES ||--o{ WORKSPACE_MEMBERS : contains
    WORKSPACES ||--o{ WALLETS : owns
    WORKSPACES ||--o{ TRANSACTIONS : owns
    WORKSPACES ||--o{ BUDGETS : owns
    WORKSPACES ||--o{ AUTOMATIONS : owns
    USERS ||--o{ AUDIT_LOGS : performs
    WORKSPACES ||--o{ AUDIT_LOGS : tracks

    USERS {
        string id PK
        string name
        string email
        string password_hash
    }
    WORKSPACES {
        string id PK
        string name
        string type
    }
    WORKSPACE_MEMBERS {
        string id PK
        string workspace_id FK
        string user_id FK
        string role
    }
    TRANSACTIONS {
        string id PK
        string workspace_id FK
        string user_id FK
        string title
        decimal amount
        string type
    }
    AUTOMATIONS {
        string id PK
        string workspace_id FK
        string name
        string trigger_type
        json conditions
        json actions
    }
```

---

## 🤖 RAG Query Pipeline

Sequence flow representing the RAG Chat advisor fetching context securely:

```mermaid
sequenceDiagram
    autonumber
    actor User as User Chat Input
    participant RAG as RAG Service
    participant LLM as LLM Provider
    participant DB as Postgres DB

    User->>RAG: Ask: "Show food spends this month"
    RAG->>LLM: Detect Intent Filters (system instructions)
    LLM-->>RAG: JSON Filters (category: "Food", date: "this-month")
    RAG->>DB: Scoped Prisma Query (where: { category, date, workspaceId })
    DB-->>RAG: Filtered JSON Context rows
    RAG->>LLM: Summarize JSON Context (system instructions)
    LLM-->>RAG: Markdown Summary response
    RAG-->>User: Rendered Conversational Reply
```
