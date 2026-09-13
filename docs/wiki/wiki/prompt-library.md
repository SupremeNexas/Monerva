# Prompt Library Wiki

Last Updated: 2026-07-19

This wiki page catalogs the system instructions and prompt templates used across our AI services. All templates are maintained under [backend/src/services/ai/prompts/index.ts](file:///Users/supryo/Desktop/Expense-Tracker/backend/src/services/ai/prompts/index.ts).

---

## 📚 Prompt Directory

### 1. Conversational Chat Advisor (`CHAT_SYSTEM_INSTRUCTION`)
*   **Role**: Premium AI financial coach.
*   **Instructions**: Format observations in brief bulleted lists. Restrict context exclusively to DB-retrieved transaction files. Keep responses concise (CRED/Notion style).

### 2. Transaction Categorizer (`CATEGORIZE_SYSTEM_INSTRUCTION`)
*   **Role**: Category classification engine.
*   **Prompt**: Evaluates input merchant names (e.g. `Uber`, `Starbucks`) and classifies them into standard categories with confidence scores and reasoning.

### 3. Subscription Detector (`SUBSCRIPTION_SYSTEM_INSTRUCTION`)
*   **Role**: Recurring fee scanner.
*   **Instructions**: Inspects user ledger logs and returns a JSON list of identified subscriptions, billing intervals (monthly/yearly), next due dates, and confidence ratings.

### 4. Spending Forecast (`FORECAST_SYSTEM_INSTRUCTION`)
*   **Role**: Month-end spending forecaster.
*   **Instructions**: Evaluates current limit caps and historical trends. Outputs expected totals, savings rates, and budget overrun warnings.

### 5. Spending Insights (`INSIGHTS_SYSTEM_INSTRUCTION`)
*   **Role**: Spending habits analyst.
*   **Instructions**: Observes anomalies, weekend dining spikes, or post-salary shopping sprees and translates them into actionable insights.

### 6. Budget Advisor (`RECOMMENDATIONS_SYSTEM_INSTRUCTION`)
*   **Role**: Budget recommendation advisor.
*   **Instructions**: Analyzes historical spend averages and recommends category cap limits.

### 7. Financial Health Score (`HEALTH_SCORE_SYSTEM_INSTRUCTION`)
*   **Role**: Health scorer.
*   **Instructions**: Receives programmatically computed margins and outputs overall score status cards and improvement tips.

### 8. RAG Intent Detector (`RAG_INTENT_SYSTEM_INSTRUCTION`)
*   **Role**: Natural language intent classifier.
*   **Instructions**: Extracts categories, merchants, date limits, and transaction types from user chat messages to build query filters.

---

## 🔗 Related Resources
*   Read [[wiki/ai-architecture]] for module design.
*   Read [[wiki/rag]] for information on RAG flow.
