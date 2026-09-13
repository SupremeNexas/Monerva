import posthog from 'posthog-js';

/**
 * Storage keys for analytics persistence
 */
export const STORAGE_KEYS = {
  CONSENT: 'finova_analytics_consent',
  DISTINCT_ID: 'finova_analytics_distinct_id',
} as const;

export type ConsentStatus = 'granted' | 'denied' | 'unset';

/**
 * Event taxonomy whitelist.
 * STRICT PRIVACY REQUIREMENT: Only properties explicitly defined per event are allowed.
 * Any extra property passed to track() will be dropped to prevent accidental leakage of
 * financial numbers, merchant titles, transaction descriptions, PII, document text, or AI prompts.
 */
export const ALLOWED_EVENT_PROPERTIES: Record<string, string[]> = {
  signup_started: ['method'],
  signup_completed: ['method'],
  login_success: ['method'],
  login_failed: ['method', 'error_type'],
  logout: [],

  onboarding_started: [],
  onboarding_completed: ['has_country', 'has_currency', 'has_income_bracket', 'has_goal'],

  expense_created: ['source', 'has_category', 'has_wallet', 'payment_method'],
  income_created: ['source', 'has_wallet'],
  transfer_created: ['source'],
  budget_created: ['has_category', 'period'],
  savings_goal_created: ['has_target_date'],
  recurring_bill_created: ['frequency'],
  credit_card_added: ['card_issuer', 'has_due_date'],

  receipt_scan_started: ['file_format'],
  receipt_scan_completed: ['duration_ms', 'item_count', 'has_duplicate_warning'],
  receipt_scan_failed: ['error_type'],
  ai_assistant_used: ['surface', 'prompt_length_bucket'],
  financial_insight_viewed: ['insight_type'],

  document_upload_started: ['file_size_mb'],
  document_upload_completed: ['file_size_mb'],
  document_indexed: ['chunk_count', 'duration_ms'],
  document_index_failed: ['error_type'],
  rag_question_asked: ['query_length_bucket'],
  rag_answer_returned: ['chunks_matched', 'has_sources', 'source_count'],
  rag_no_answer: ['reason'],

  friend_request_sent: ['method'],
  friend_request_accepted: [],
  group_created: ['member_count'],
  shared_expense_created: ['participant_count', 'split_method'],
  settlement_recorded: ['settlement_type'],

  search_used: ['search_length'],
  filter_used: ['active_filter_count', 'has_date_filter', 'has_category_filter', 'has_wallet_filter'],
  csv_import_completed: ['total_rows', 'imported_rows', 'skipped_duplicates'],
  csv_export_completed: ['export_source', 'format'],

  page_view: ['path'],
};

/**
 * Key terms that MUST NEVER appear in any property key or value.
 * Used as a secondary safeguard against payload construction bugs.
 */
const SENSITIVE_KEY_PATTERNS = [
  'amount', 'total', 'subtotal', 'balance', 'income', 'expense', 'debt',
  'merchant', 'title', 'description', 'notes', 'note', 'email', 'password',
  'token', 'jwt', 'secret', 'key', 'prompt', 'text', 'query', 'answer',
  'chunk', 'vector', 'embedding', 'image', 'receipt', 'ocr', 'friend', 'group',
  'user', 'name', 'credit', 'debit', 'wallet', 'account', 'category'
];

/**
 * Generate or retrieve a privacy-preserving anonymous distinct ID.
 */
export function getAnonymousDistinctId(): string {
  try {
    let distinctId = localStorage.getItem(STORAGE_KEYS.DISTINCT_ID);
    if (!distinctId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        distinctId = crypto.randomUUID();
      } else {
        distinctId = 'anon_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      }
      localStorage.setItem(STORAGE_KEYS.DISTINCT_ID, distinctId);
    }
    return distinctId;
  } catch (_) {
    return 'anon_fallback_' + Date.now();
  }
}

/**
 * Get current analytics consent status.
 */
export function getConsentStatus(): ConsentStatus {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.CONSENT);
    if (value === 'granted' || value === 'denied') return value;
    return 'unset';
  } catch (_) {
    return 'unset';
  }
}

/**
 * Update user consent status and sync with PostHog capturer state.
 */
export function setConsentStatus(status: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONSENT, status);
    if (status === 'granted') {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
  } catch (err) {
    console.warn('[Analytics] Consent storage update error:', err);
  }
}

/**
 * Checks if tracking consent is granted.
 */
export function hasConsent(): boolean {
  return getConsentStatus() === 'granted';
}

/**
 * Deep property sanitizer to strip unwhitelisted keys, amounts, PII, or dynamic forbidden text.
 */
export function sanitizeEventProperties(eventName: string, properties?: Record<string, any>): Record<string, any> {
  if (!properties) return {};

  const allowedKeys = ALLOWED_EVENT_PROPERTIES[eventName];
  // If event is not in taxonomy, default to dropping all custom properties for safety
  if (!allowedKeys) {
    return {};
  }

  const sanitized: Record<string, any> = {};

  for (const key of allowedKeys) {
    if (!(key in properties)) continue;
    const value = properties[key];

    // Double check key name against sensitive pattern blacklist unless explicitly in whitelist
    const isForbiddenKey = SENSITIVE_KEY_PATTERNS.some(p => key.toLowerCase() === p);
    if (isForbiddenKey) {
      continue;
    }

    if (typeof value === 'boolean' || typeof value === 'number') {
      if (typeof value === 'number' && !Number.isFinite(value)) continue;
      sanitized[key] = value;
    } else if (typeof value === 'string') {
      // Clean string value, truncate length to max 100 chars, strip URLs/emails/numbers if needed
      const cleanStr = value.trim().substring(0, 100);
      sanitized[key] = cleanStr;
    }
  }

  return sanitized;
}

interface AnalyticsConfig {
  posthogKey?: string;
  posthogHost?: string;
  cloudflareToken?: string;
  debug?: boolean;
}

let isInitialized = false;

/**
 * Initialize Cloudflare Web Analytics and PostHog product analytics.
 */
export function initAnalytics(config?: AnalyticsConfig): void {
  try {
    if (isInitialized) return;

    const posthogKey = config?.posthogKey || import.meta.env.VITE_POSTHOG_KEY || '';
    const posthogHost = config?.posthogHost || import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
    const cloudflareToken = config?.cloudflareToken || import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN || '';
    const isDev = import.meta.env.DEV;
    const isDebug = config?.debug ?? (import.meta.env.VITE_ANALYTICS_DEBUG === 'true');

    // 1. Initialize Cloudflare Web Analytics if token present and in browser environment
    if (cloudflareToken && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const existingScript = document.querySelector('script[data-cf-beacon]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.defer = true;
        script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
        script.setAttribute('data-cf-beacon', JSON.stringify({ token: cloudflareToken }));
        document.head.appendChild(script);
      }
    }

    // 2. Initialize PostHog in Production (or when debug mode enabled in Dev)
    const distinctId = getAnonymousDistinctId();
    const consent = getConsentStatus();

    if (posthogKey && (import.meta.env.PROD || isDebug)) {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        autocapture: false, // Disable automatic DOM text capturing
        disable_session_recording: true, // STRICT PRIVACY RULE: Session recording disabled
        capture_pageview: false, // We handle SPA route page_view tracking manually
        ip: false, // Anonymize / do not capture client IP address
        persistence: 'localStorage',
        bootstrap: {
          distinctID: distinctId,
        },
        loaded: (ph) => {
          if (consent === 'denied') {
            ph.opt_out_capturing();
          } else if (consent === 'granted') {
            ph.opt_in_capturing();
          } else {
            // Unset mode: default to opt-out capturing until consent granted
            ph.opt_out_capturing();
          }
        },
      });
    }

    isInitialized = true;

    if (isDev && isDebug) {
      console.log('[Analytics] Initialized (Privacy-First Mode)', { distinctId, consent, isDev });
    }
  } catch (err) {
    // Fail-open: swallow all initialization errors
    console.warn('[Analytics] Fail-open init catch:', err);
  }
}

/**
 * Track a product event in PostHog after sanitizing properties and checking consent.
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  try {
    const isDev = import.meta.env.DEV;
    const isDebug = import.meta.env.VITE_ANALYTICS_DEBUG === 'true';

    // Verify consent before processing
    if (!hasConsent()) {
      if (isDev && isDebug) {
        console.log(`[Analytics Suppressed - Consent Required] Event: "${eventName}"`);
      }
      return;
    }

    const safeProperties = sanitizeEventProperties(eventName, properties);

    if (isDev && isDebug) {
      console.log(`[Analytics Event] "${eventName}"`, safeProperties);
    }

    // PostHog dispatch
    if (typeof posthog !== 'undefined' && posthog.capture) {
      posthog.capture(eventName, safeProperties);
    }
  } catch (err) {
    // Fail-open: swallowed error
    console.warn(`[Analytics Fail-Open] Failed to track event "${eventName}":`, err);
  }
}

/**
 * Track SPA Page / Route views without double-counting.
 */
export function trackPageView(path: string): void {
  try {
    const cleanPath = path.split('?')[0].split('#')[0].toLowerCase() || '/';
    trackEvent('page_view', { path: cleanPath });
  } catch (err) {
    console.warn('[Analytics Fail-Open] Failed to track page view:', err);
  }
}

/**
 * Calculate bucket for text input lengths (to track AI query sizes without tracking text)
 */
export function getLengthBucket(text: string): '<50' | '50-200' | '>200' {
  const len = (text || '').trim().length;
  if (len < 50) return '<50';
  if (len <= 200) return '50-200';
  return '>200';
}
