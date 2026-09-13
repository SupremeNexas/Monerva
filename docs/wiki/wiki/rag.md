# Retrieval-Augmented Generation (RAG) Wiki

Last Updated: 2026-07-20

This wiki page outlines the design, privacy conventions, and modular service structure of the RAG pipeline used by the AI Financial Assistant to answer natural language questions.

---

## 🔒 Privacy-First RAG Flow

To protect sensitive records and prevent API context token bloat, the assistant avoids sending the entire database to the LLM. Instead, it utilizes a multi-step query synthesis.

```text
User Question  -->  [Intent Detection]  -->  Extract JSON Filters
                                                     ↓
Conversational <--  [Context Explainer] <--  Query Prisma DB
    Answer              & Charts                 & Calculate Stats
```

---

## 🏗️ Modular RAG Service Pipeline

Under `backend/src/services/ai/`, the RAG architecture is split into six decoupled services:

1. **`intent.service.ts`**: Classifies user queries into 10 deterministic financial intents (SUMMARY, COMPARISON, BUDGET, CATEGORY, MERCHANT, SUBSCRIPTION, LARGEST_EXPENSE, SAVINGS, FORECAST, TRANSACTION_SEARCH) and extracts parameters (category, merchant, timeframe, limits).
2. **`query.service.ts`**: Formulates secure Prisma database queries scoped strictly by `userId` and `workspaceId` to retrieve relevant records.
3. **`analysis.service.ts`**: Computes sums, daily averages, timeframe differences, category breakdowns, and budget usage percentages.
4. **`prompt.service.ts`**: Defines system instructions and prompts.
5. **`response.service.ts`**: Sends computed statistics to the LLM to get a grounded conversational markdown answer, and configures visual chart layouts (Bar, Line, Pie).
6. **`ai.service.ts`**: Orchestrates the entire flow and returns a structured response:
   ```json
   {
     "answer": "Grounded explanation text...",
     "charts": [{ "type": "bar", "title": "...", "data": [...] }],
     "transactions": [...],
     "summary": {...}
   }
   ```

---

## 💡 Natural Language Query Mapping

The RAG engine supports dynamic query intents:
*   *Query*: "Where did I spend the most this month?"  
    *Result*: Intent `LARGEST_EXPENSE`, limit 1, timeframe `this-month`.
*   *Query*: "How much have I spent on food this year?"  
    *Result*: Intent `CATEGORY`, category "Food", timeframe `this-year`.
*   *Query*: "Show all Amazon purchases."  
    *Result*: Intent `MERCHANT`, merchant "Amazon", timeframe `all`.
*   *Query*: "Compare this month and last month."
    *Result*: Intent `COMPARISON`, timeframe `this-month`, compareTimeframe `last-month`.

---

## 🔗 Related Resources
*   Read [[wiki/ai-architecture]] for module overview.
*   Read [[wiki/prompt-library]] for templates cataloging.
