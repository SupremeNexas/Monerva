# AI Features Wiki
Last Updated: 2026-07-05

This document details the AI service logic, multimodal models, and prompt structures.

---

## 🤖 AI Integrations

### 1. Multimodal Vision Receipt Scanner
* **Route**: `/api/ai/scan`
* **Model**: Google Gemini Multimodal Vision API (`gemini-2.5-flash` or similar, via `@google/genai` client).
* **Payload**: Accepts multipart file uploads via Multer.
* **OCR Output**: Extracts the merchants, purchase amounts, date, category recommendation, and optional line items.
* **Fallback**: Returns simulated JSON response if `GEMINI_API_KEY` is not set.

### 2. Conversational Coach (Floating Advisor)
* **Route**: `/api/ai/chat`
* **Context**: Fed with user-specific database stats (spending history, active budgets, credit card due dates) to deliver contextual guidance (e.g. "You spent 80% of your Dining budget").

---

## 🔗 Related Resources
* Read [[CODEX.md]] for standards.
* Read [[CLAUDE.md]] for commands.
