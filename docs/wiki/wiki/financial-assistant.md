# AI Financial Assistant Wiki

Last Updated: 2026-07-19

This wiki page describes the functionalities, calculations, and visual panels comprising the AI Financial Copilot assistant.

---

## 📊 Bento Copilot Dashboard

The [CopilotPage.tsx](file:///Users/supryo/Desktop/Expense-Tracker/frontend/src/pages/CopilotPage.tsx) interface consolidates seven AI services into three primary views:

### 1. Financial Health Score Meter
*   **Methodology**: Programmatically calculates precise numerical metrics (savings rate, budget adherence ratio, fixed subscription burdens) to prevent LLM mathematical hallucinations.
*   **LLM Advisor**: Feeds calculated values to the provider to generate custom action suggestions (e.g. "Save ₹1,200/mo by dining out 1 less time weekly").

### 2. Month-End Spending Forecasts
*   **Estimate**: Analyzes historical daily spend vectors to project month-end expense totals.
*   **Overrun Alerts**: Triggers visual warnings if linear spends predict a budget cap breach.

### 3. Subscription Payment Detector
*   **Scanner**: Searches transaction history records for repeating descriptors (e.g., Netflix, Spotify).
*   **Indicators**: Tallies monthly/yearly cost rates and indicates upcoming bill cycles.

### 4. Budget Recommendation Engine
*   **Analysis**: Evaluates three-month rolling category spends.
*   **Proposals**: Suggests category caps with reasoning details.

### 5. Spending Insights Grid
*   Highlights anomalies like weekend spending sprees or post-salary shopping spikes.

---

## 📷 Receipt Intelligence Pipeline

Processes incoming files through a secure multi-modal pipeline:
1.  **OCR Scan**: Extracts merchant titles, tax rates, dates, itemized lists, and confidence percentages.
2.  **Category Mapping**: Cross-references merchant title against the user's spending habits or uses LLM categorization rules.
3.  **Interactive Form**: Populates an editable details form on the UI.
4.  **Transaction Insertion**: User reviews, edits, and clicks "Confirm" to write the record to the database and decrement the associated wallet balance.

---

## 🔗 Related Resources
*   Read [[wiki/ai-architecture]] for module structures.
*   Read [[wiki/rag]] for chat querying details.
