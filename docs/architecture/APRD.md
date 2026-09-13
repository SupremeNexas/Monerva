# Agentic Product Requirements Document (APRD)
Last Updated: 2026-07-19

This document details the functional specifications, model integrations, prompt constraints, and fallback architectures for all AI capabilities in the **antigravity** Expense Tracker.

---

## 🎯 AI System Overview
The Expense Tracker leverages Large Language Models (LLMs) and Vision Models to deliver a frictionless personal finance experience. The goal is to:
1. Eliminate manual transaction data entry via automated receipt parsing.
2. Provide context-aware, proactive financial advice through an interactive chat advisor drawer.
3. Establish a standard, context-efficient workspace that allows AI coding assistants to interact with the repository with minimal token usage.

---

## 🤖 AI Feature 1: Multimodal Vision Receipt Scanner

### 1. Objective
Enable users to upload images of physical or digital receipts and automatically extract key fields (merchant, amount, tax, date, items, category) to pre-populate the transaction form.

### 2. User Flow & UI Integration
1. User clicks **"Scan Receipt"** icon or drags-and-drops an image into the upload panel on the Dashboard.
2. The frontend sends the image binary via a multipart form data upload to `POST /api/ai/scan-receipt`.
3. The UI renders a loading shimmer while parsing.
4. Once parsed, the frontend automatically opens the **ExpenseForm** pre-filled with the extracted parameters.
5. User reviews, edits details if necessary, and clicks **"Submit"** to save.

### 3. Backend Specifications & Gemini API
* **Route**: `/api/ai/scan-receipt`
* **Model**: `gemini-2.5-flash` via the official `@google/genai` client library.
* **System Prompt**:
  > You are an expert financial receipt scanner. Extract the following fields from this receipt image as JSON: merchant, amount (total including tax, as number), tax (as number), date (YYYY-MM-DD format), category (one of: Food, Travel, Fuel, Shopping, Bills, Health, Education, Entertainment, Salary, Investment, Gift, Other), items (list of string items), confidence (estimate from 0 to 1). Return ONLY the raw JSON block without markdown formatting or code blocks.
* **Response Mapping**:
  The backend parses the raw text response, strips markdown blocks, parses the JSON, and casts fields to type-safe numbers and formatted dates.

### 4. High-Fidelity Mock Fallback
To ensure continuous operation during API limits or if `GEMINI_API_KEY` is not configured, the backend implements file-specific mock parsers:
* If filename contains `uber` or `ola` -> Auto-extracts "Uber Rides Inc", amount 450.00, category "Travel".
* If filename contains `amazon` or `zara` -> Auto-extracts "Zara Delhi NCR", amount 4299.00, category "Shopping".
* Default fallback -> Mock-scans a general meal receipt (merchant: "McDonalds Bistro", amount: 680.00, category: "Food").

---

## 💬 AI Feature 2: Conversational Financial Coach

### 1. Objective
Provide real-time, context-loaded financial guidance in a drawer overlay, powered by the user's actual balance sheets, active budget allocations, and upcoming obligations.

### 2. Context Loading Protocol
When the user sends a message in the AI Coach chat drawer (`POST /api/ai/chat`), the backend dynamically queries the following databases to inject context into the prompt:
1. **User Profile**: Base currency and settings.
2. **Current Balances**: Total cash, bank accounts, and credit card dues.
3. **Budget Statuses**: Category thresholds limits and current spent percentages.
4. **Obligations Calendar**: Unpaid bills approaching due dates and active subscriptions burn rate.
5. **Recent Transactions**: Last 10 logged expenses to identify spending patterns.

### 3. Prompt Constraints & Tone Guidelines
* **Role**: Act as a premium, supportive personal wealth manager named **antigravity Coach**.
* **Tone**: Professional, encouraging, clear, and action-oriented. Avoid verbose descriptions.
* **Privacy Boundary**: Never expose cross-user details. The context must strictly check scoping permissions (`userId: req.user.id`).
* **Visual Style**: Recommend HSL theme keys where styling can be applied. Break down complex advice using bullet lists.

---

## 📂 Repository Layering & Agentic Architecture
To allow autonomous agents (like Antigravity, Claude Code, Cursor) to maintain this project efficiently:
1. **Operating Rules**: Core protocols reside in `CLAUDE.md`, `CODEX.md`, and `AGENTS.md`.
2. **LLM Wiki**: Compact `/wiki` markdown files describe separate modules in isolation (e.g. `wiki/database.md`, `wiki/wallets.md`).
3. **Obsidian Brain**: Synced `/knowledge` files allow human-AI collaborative knowledge mapping with backlinks.
4. **Memory Layer**: `/memory` stores running statuses, ADR logs, and release notes to act as persistent memory across sessions.

---

## 🔗 Related Resources
* Read [[CLAUDE.md]] for commands.
* Visit [[wiki/ai]] for technical OCR structures.
* Visit [[wiki/api-reference]] for REST endpoint schemas.
