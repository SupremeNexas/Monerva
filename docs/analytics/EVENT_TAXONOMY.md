# Finova Analytics Event Taxonomy

**Document Version:** 1.0.0  
**Last Updated:** September 13, 2026  

---

## Event Taxonomy Reference

This table defines all product analytics events tracked within Finova. Every event strictly enforces privacy rules: **no financial amounts, merchant names, transaction descriptions, document contents, AI prompts, or personal identifiers are allowed.**

| Event | Trigger | Allowed Properties | Forbidden Data | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `signup_started` | User opens signup tab or modal on `/auth` | `method` ("email" \| "google") | Email address, password, user name | Track signup intent and conversion funnel start |
| `signup_completed` | User registration succeeds | `method` ("email" \| "google") | User ID, email address, display name | Measure registration conversion rate |
| `login_success` | User authentication succeeds | `method` ("email" \| "google") | Auth token, email address, password | Track user active login frequency |
| `login_failed` | Login attempt fails | `method` ("email" \| "google"), `error_type` ("invalid_credentials" \| "network_error" \| "rate_limited") | Password, email address, credentials | Monitor authentication reliability and user friction |
| `logout` | User logs out of application | *None* | User ID, session tokens | Track session termination |
| `onboarding_started` | User lands on step 1 of `/profile-setup` | *None* | User name, profile details | Measure onboarding funnel start |
| `onboarding_completed` | User completes profile setup wizard | `has_country` (boolean), `has_currency` (boolean), `has_income_bracket` (boolean), `has_goal` (boolean) | Real name, display name, base currency code, income range text | Measure onboarding completion rate and preference trends |
| `expense_created` | User submits new expense transaction | `source` ("manual" \| "receipt_scan" \| "csv_import"), `has_category` (boolean), `has_wallet` (boolean), `payment_method` ("UPI" \| "Card" \| "Cash" \| "Bank Transfer") | Transaction amount, currency, merchant name, notes, category name, wallet name | Understand how users record expenses and payment methods used |
| `income_created` | User logs an income entry | `source` ("manual" \| "csv_import"), `has_wallet` (boolean) | Income amount, payer name, notes, category name | Measure income feature adoption without tracking wealth |
| `transfer_created` | User records transfer between wallets | `source` ("manual") | Transfer amount, source wallet name, destination wallet name | Track inter-account transfer usage |
| `budget_created` | User sets a category budget limit | `has_category` (boolean), `period` ("monthly" \| "yearly") | Budget target amount, category name, workspace ID | Track budget setting feature adoption |
| `savings_goal_created` | User creates a savings target | `has_target_date` (boolean) | Target goal amount, goal title, current savings balance | Understand savings milestone tracking usage |
| `recurring_bill_created` | User logs a recurring bill or subscription | `frequency` ("monthly" \| "yearly") | Bill amount, bill name/merchant, payment account details | Track recurring payment management usage |
| `credit_card_added` | User registers a credit card | `card_issuer` ("VISA" \| "MASTERCARD" \| "AMEX" \| "OTHER"), `has_due_date` (boolean) | Card number, card name, credit limit, current statement balance | Track credit card module engagement |
| `receipt_scan_started` | User initiates receipt image upload/camera scan | `file_format` ("png" \| "jpg" \| "webp" \| "pdf") | Receipt image data, file name | Measure receipt scanner initialization |
| `receipt_scan_completed` | AI receipt OCR extraction succeeds | `duration_ms` (number), `item_count` (number), `has_duplicate_warning` (boolean) | Merchant name, item titles, subtotal, tax, tip, total amount | Evaluate OCR speed and extraction complexity |
| `receipt_scan_failed` | AI receipt OCR fails or is blocked by paywall | `error_type` ("paywall_required" \| "invalid_format" \| "file_too_large" \| "server_error") | Receipt image contents, error message containing user text | Track OCR scanner error rates and paywall drop-offs |
| `ai_assistant_used` | User submits a prompt to AI Assistant or Copilot | `surface` ("assistant" \| "copilot"), `prompt_length_bucket` ("<50" \| "50-200" \| ">200") | Prompt text, financial questions, user ledger contents | Measure AI assistant engagement and message lengths |
| `financial_insight_viewed` | User views financial health score or copilot insights | `insight_type` ("health_score" \| "forecast" \| "recommendation") | Health score value, savings rate %, budget overrun amounts | Measure engagement with AI financial coaching |
| `document_upload_started` | User uploads PDF document to Financial Vault | `file_size_mb` (number) | PDF file name, PDF document contents | Measure document vault upload volume |
| `document_upload_completed` | PDF document upload finishes processing | `file_size_mb` (number) | PDF title, PDF content | Measure document upload completion |
| `document_indexed` | PDF text extraction & vector embedding generation succeeds | `chunk_count` (number), `duration_ms` (number) | Extracted text, embeddings, document title, page contents | Monitor pgvector index generation performance |
| `document_index_failed` | PDF vector indexing fails | `error_type` ("parse_error" \| "paywall_required" \| "server_error") | Document text, file title | Monitor RAG indexing error rate |
| `rag_question_asked` | User submits query to Document RAG assistant | `query_length_bucket` ("<50" \| "50-200" \| ">200") | Question text, document contents | Measure RAG search usage |
| `rag_answer_returned` | RAG assistant returns grounded answer with source citations | `chunks_matched` (number), `has_sources` (boolean), `source_count` (number) | Generated answer text, cited source filenames, text excerpts | Track RAG retrieval effectiveness |
| `rag_no_answer` | RAG query returns zero matching document chunks or fails | `reason` ("no_chunks_found" \| "error") | Question text, user document contents | Track RAG search misses and quality gaps |
| `friend_request_sent` | User sends friend connection invitation | `method` ("email_search" \| "invite_link") | Target user email, friend name, personal invite link | Measure social feature expansion |
| `friend_request_accepted` | User accepts inbound friend request | *None* | Friend name, friend email address | Measure social network growth |
| `group_created` | User creates collaborative ledger group | `member_count` (number) | Group name, member names, member emails | Track social group creation |
| `shared_expense_created` | User logs shared bill split with friend or group | `participant_count` (number), `split_method` ("equal" \| "exact" \| "percentage" \| "shares") | Expense title, total amount, individual split amounts, member names | Track shared ledger splitting feature usage |
| `settlement_recorded` | User records debt settlement with friend | `settlement_type` ("friend" \| "group") | Settlement amount, member names, payment notes | Track debt settlement completion rate |
| `search_used` | User performs transaction keyword search | `search_length` (number) | Search query text, merchant query, search results | Measure transaction search activity |
| `filter_used` | User applies filters on transaction list | `active_filter_count` (number), `has_date_filter` (boolean), `has_category_filter` (boolean), `has_wallet_filter` (boolean) | Filter values, category names, wallet names, date strings | Measure transaction filtering usage |
| `csv_import_completed` | User finishes batch CSV transaction import | `total_rows` (number), `imported_rows` (number), `skipped_duplicates` (number) | CSV file contents, merchant titles, transaction amounts | Track data import volume and duplicate handling |
| `csv_export_completed` | User downloads CSV or JSON export of ledger | `export_source` ("expenses" \| "analytics" \| "workspace_settings"), `format` ("csv" \| "json") | Exported financial numbers, transaction titles | Track data export feature usage |
| `page_view` | SPA route navigation occurs | `path` (sanitized route path e.g. "/dashboard") | Dynamic query parameters containing user data | Track screen navigation and active views |

---

## Verification & Compliance Audit Policy

1. **Automated Property Sanitizer:** All events pass through `sanitizeEventProperties()` before sending. Any property key containing `amount`, `total`, `balance`, `merchant`, `title`, `description`, `notes`, `email`, `name`, `prompt`, `text`, or `chunk` is automatically stripped.
2. **Privacy Audit Routine:** Run `npm test` to verify the analytics test suite passes, ensuring no forbidden keys are ever transmitted in payload objects.
