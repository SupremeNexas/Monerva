# Finova Privacy-First Analytics Infrastructure Plan

**Document Version:** 1.0.0  
**Effective Date:** September 13, 2026  
**Status:** Approved Architectural Standard  

---

## 1. Overview & Privacy Principles

Finova is a personal financial ledger and accounting application handling sensitive transaction records, income details, debt balances, receipt images, and financial RAG documents. 

The goal of Finova's analytics foundation is to analyze application usability, technical performance, and product adoption **without ever collecting, transmitting, or storing user financial information or personal identity markers**.

### Critical Non-Negotiable Privacy Rules:
1. **Zero Financial Leakage:** Never send transaction amounts, account/wallet balances, income values, debt amounts, budget limits, savings milestones, receipt contents, or financial totals to any analytics provider.
2. **Zero Content Leakage:** Never send transaction titles, descriptions, merchant names, notes, category names, wallet names, tags, friend names, group names, uploaded PDF text, receipt OCR text, AI chat prompts, RAG document queries, RAG context chunks, or AI answers.
3. **Zero Identity Leakage:** Never send raw email addresses, real names, phone numbers, auth JWT tokens, or external identity sub IDs to analytics services.
4. **No Session Recording:** Session replay tools (e.g. PostHog Session Recording, FullStory, Hotjar) are strictly disabled to prevent visual capture of financial numbers and inputs.
5. **No Google Analytics:** Google Analytics and third-party advertising pixels are prohibited.
6. **No Secondary Data Store:** Analytics data must never serve as a cache or secondary data store for core application features.
7. **Strict Fail-Open Error Isolation:** Any failure in network requests to analytics endpoints must be swallowed gracefully and must NEVER disrupt application functionality (auth, dashboard, ledger operations, AI tools, or RAG vault).

---

## 2. Analytics Providers & Roles

Finova utilizes two specialized, privacy-focused analytics providers:

### 2.1 Cloudflare Web Analytics
* **Purpose:** Privacy-first website performance, core web vitals, page loading speeds, and aggregate geographic traffic metrics.
* **Data Collected:** Anonymous page visit counts, load times, HTTP status codes, browser user-agent types, country-level geography, and Web Vitals (LCP, FID, CLS).
* **Privacy Model:** Cloudflare Web Analytics operates without client-side cookies or fingerprinting. It does not track users across sites.

### 2.2 PostHog (Product Analytics)
* **Purpose:** Product feature engagement, workflow completion rates, user retention analysis, and drop-off identification across core application features.
* **Data Collected:** Standardized event names (e.g., `expense_created`, `receipt_scan_completed`), anonymized user distinct IDs, and technical environment properties (browser name, OS, screen resolution).
* **Configuration:** Self-hosted or privacy-configured PostHog instance with IP anonymization enabled, autocapture restricted to basic UI elements without text capture, and session recording disabled.

---

## 3. Data Flow & System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Finova React SPA                              │
│                                                                        │
│  ┌──────────────────────┐               ┌───────────────────────────┐  │
│  │   Application State  │               │   User Consent Manager    │  │
│  └──────────┬───────────┘               └─────────────┬─────────────┘  │
│             │                                         │                │
│             ▼                                         ▼                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   Privacy Analytics Service                      │  │
│  │  - Property Sanitizer (strips amounts, text, PII, names)         │  │
│  │  - Consent Check (respects user opt-out)                         │  │
│  │  - Environment Check (disables in local dev / tests)             │  │
│  └──────────┬─────────────────────────────────────────┬─────────────┘  │
└─────────────┼─────────────────────────────────────────┼────────────────┘
              │ (Performance metrics)                   │ (Product events)
              ▼                                         ▼
┌──────────────────────────┐               ┌──────────────────────────┐
│ Cloudflare Web Analytics │               │     PostHog Instance     │
└──────────────────────────┘               └──────────────────────────┘
```

---

## 4. User Identity & Session Identification Strategy

1. **Anonymous Distinct Identifiers:**
   - Users are assigned a randomly generated UUID v4 string upon first site visit (`finova_analytics_distinct_id`) stored in browser `localStorage`.
   - The distinct ID is completely unlinked from user database primary keys, email addresses, or workspace IDs.

2. **No Cross-Device Identity Linking:**
   - Finova does not call `posthog.identify()` with user emails, real names, or database IDs.
   - User identity remains pseudonymous.

3. **Workspace Isolation:**
   - Workspace IDs, tenant slugs, and multi-tenant keys are NOT attached to analytics event payloads.

---

## 5. Event & Property Taxonomy Overview

All events logged to PostHog follow strict schemas. Allowed properties are metadata-only (enums, booleans, counts, durations).

| Event Category | Sample Event | Allowed Properties | Strictly Forbidden Data |
| :--- | :--- | :--- | :--- |
| **Authentication** | `login_success` | `method` ("email" \| "google") | Password, email, JWT token, user name |
| **Onboarding** | `onboarding_completed` | `has_country`, `has_currency` | Currency code if non-standard, user name, goals text |
| **Core Finance** | `expense_created` | `source` ("manual" \| "receipt_scan" \| "csv_import"), `payment_method` | Amount, merchant name, description, category name, wallet name |
| **AI Features** | `receipt_scan_completed` | `duration_ms`, `item_count`, `has_duplicate_warning` | Receipt image, store name, item titles, prices, tax amounts |
| **Document RAG** | `rag_answer_returned` | `chunks_matched`, `has_sources`, `source_count` | Document text, filenames, question text, vector embeddings, answer text |
| **Friends/Groups** | `shared_expense_created` | `participant_count`, `split_method` | Debt amount, friend names, group names |
| **Search/Export** | `csv_import_completed` | `total_rows`, `imported_rows`, `skipped_duplicates` | CSV row contents, financial data, merchant names |

*For complete event definitions, see `docs/analytics/EVENT_TAXONOMY.md`.*

---

## 6. Consent, Legal & Opt-Out Framework

### 6.1 Regulatory Compliance
- **GDPR / ePrivacy Directive:** PostHog non-essential tracking is gated behind affirmative user consent.
- **CCPA / CPRA:** Users can opt out of analytics tracking at any time via the Privacy Policy and Cookie Policy settings.
- **DPDP Act 2023 (India):** Notice is provided, and analytics tracking strictly excludes personal data processing.

### 6.2 Consent Mechanism & Local Storage
- Consent choice is stored in browser `localStorage` under key `finova_analytics_consent` with values `'granted'` | `'denied'`.
- Default behavior: Analytics initializes in restricted mode. Product event dispatching to PostHog occurs ONLY if `finova_analytics_consent` is `'granted'`.
- Cloudflare Web Analytics executes without cookies and does not store user identifiers.

### 6.3 Cookie Policy Update Inventory
| Local Storage Key | Category | Purpose | Expiration |
| :--- | :--- | :--- | :--- |
| `finova_analytics_consent` | Preference | Stores user opt-in / opt-out decision for product analytics | Persistent |
| `finova_analytics_distinct_id` | Analytics | Randomly generated anonymous distinct ID for PostHog event aggregation | Persistent |

---

## 7. Development vs. Production Behavior

| Environment | Behavior |
| :--- | :--- |
| **Development (`import.meta.env.DEV`)** | PostHog telemetry is **DISABLED** by default. Event calls log to browser console when `VITE_ANALYTICS_DEBUG=true`. No remote network requests are sent. |
| **Automated Testing (`vitest`)** | Analytics module operates in mock mode. Events register in internal memory buffers for test assertions. |
| **Production (`import.meta.env.PROD`)** | PostHog activates only if `VITE_POSTHOG_KEY` is present and user consent is `'granted'`. Cloudflare Analytics activates only if `VITE_CLOUDFLARE_ANALYTICS_TOKEN` is present. |

---

## 8. Data Retention & Erasure

- **PostHog Data Retention:** Event retention is set to 90 days in PostHog configuration.
- **Account Deletion:** When a user deletes their account, local browser storage (`finova_analytics_consent`, `finova_analytics_distinct_id`) is purged immediately alongside application tokens.

---

## 9. Environment Variables Specification

The frontend requires the following environment variables:

```env
# ── Analytics Configuration ───────────────────────────────────────────────────
# Public client API key for PostHog (Frontend)
VITE_POSTHOG_KEY="phc_your_posthog_public_key_here"

# PostHog API Host (defaults to https://us.i.posthog.com or your self-hosted proxy)
VITE_POSTHOG_HOST="https://us.i.posthog.com"

# Cloudflare Web Analytics Beacon Token (Optional, for Cloudflare JS snippet)
VITE_CLOUDFLARE_ANALYTICS_TOKEN="your_cloudflare_analytics_token_here"

# Optional debug flag for local development console logging
VITE_ANALYTICS_DEBUG="false"
```
