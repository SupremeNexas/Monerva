// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import posthog from 'posthog-js';
import {
  STORAGE_KEYS,
  getConsentStatus,
  setConsentStatus,
  hasConsent,
  getAnonymousDistinctId,
  sanitizeEventProperties,
  trackEvent,
  trackPageView,
  getLengthBucket,
} from './analytics';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

// In-memory localStorage mock for test environment
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Analytics Privacy Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Consent & Storage Management', () => {
    it('defaults consent status to unset when localStorage is empty', () => {
      expect(getConsentStatus()).toBe('unset');
      expect(hasConsent()).toBe(false);
    });

    it('persists consent status in localStorage when updated', () => {
      setConsentStatus('granted');
      expect(getConsentStatus()).toBe('granted');
      expect(hasConsent()).toBe(true);
      expect(localStorage.getItem(STORAGE_KEYS.CONSENT)).toBe('granted');
      expect(posthog.opt_in_capturing).toHaveBeenCalled();

      setConsentStatus('denied');
      expect(getConsentStatus()).toBe('denied');
      expect(hasConsent()).toBe(false);
      expect(localStorage.getItem(STORAGE_KEYS.CONSENT)).toBe('denied');
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
    });
  });

  describe('Anonymous Distinct ID Generation', () => {
    it('generates and persists an anonymous distinct ID in localStorage', () => {
      const distinctId1 = getAnonymousDistinctId();
      expect(distinctId1).toBeTypeOf('string');
      expect(distinctId1.length).toBeGreaterThan(10);
      expect(localStorage.getItem(STORAGE_KEYS.DISTINCT_ID)).toBe(distinctId1);

      // Subsequent calls return the same ID
      const distinctId2 = getAnonymousDistinctId();
      expect(distinctId2).toBe(distinctId1);
    });

    it('never contains personal email or credentials in distinct ID', () => {
      const distinctId = getAnonymousDistinctId();
      expect(distinctId).not.toContain('@');
      expect(distinctId).not.toContain('user');
    });
  });

  describe('Property Sanitizer & Privacy Safeguards', () => {
    it('strips all unwhitelisted properties from events', () => {
      const payload = {
        source: 'manual',
        amount: 5000.75, // Forbidden property
        merchant: 'Starbucks Coffee', // Forbidden property
        description: 'Morning espresso and bagel', // Forbidden property
        notes: 'Secret transaction note', // Forbidden property
        email: 'user@example.com', // Forbidden PII
      };

      const sanitized = sanitizeEventProperties('expense_created', payload);

      expect(sanitized).toEqual({
        source: 'manual',
      });
      expect(sanitized).not.toHaveProperty('amount');
      expect(sanitized).not.toHaveProperty('merchant');
      expect(sanitized).not.toHaveProperty('description');
      expect(sanitized).not.toHaveProperty('notes');
      expect(sanitized).not.toHaveProperty('email');
    });

    it('strips prompt text and RAG document contents from AI events', () => {
      const aiPayload = {
        surface: 'assistant',
        prompt_length_bucket: '50-200',
        prompt_text: 'Show all my secret transactions for last month', // Forbidden
        document_text: 'Loan Agreement #99283 Confidential text', // Forbidden
      };

      const sanitized = sanitizeEventProperties('ai_assistant_used', aiPayload);

      expect(sanitized).toEqual({
        surface: 'assistant',
        prompt_length_bucket: '50-200',
      });
      expect(sanitized).not.toHaveProperty('prompt_text');
      expect(sanitized).not.toHaveProperty('document_text');
    });

    it('returns empty object for unregistered events in taxonomy', () => {
      const payload = {
        custom_key: 'custom_value',
        amount: 100,
      };

      const sanitized = sanitizeEventProperties('unknown_custom_event', payload);
      expect(sanitized).toEqual({});
    });

    it('sanitizes strings and rejects non-finite numbers', () => {
      const payload = {
        file_size_mb: Infinity,
        error_type: '   server_error   ',
      };

      const sanitized = sanitizeEventProperties('document_upload_started', payload);
      expect(sanitized).toEqual({});

      const validPayload = sanitizeEventProperties('document_index_failed', { error_type: ' server_error ' });
      expect(validPayload).toEqual({ error_type: 'server_error' });
    });
  });

  describe('Event Tracking & Consent Gatekeeper', () => {
    it('suppresses tracking calls when user consent is denied', () => {
      setConsentStatus('denied');

      trackEvent('expense_created', { source: 'manual' });
      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it('dispatches sanitized event when consent is granted', () => {
      setConsentStatus('granted');

      trackEvent('expense_created', {
        source: 'manual',
        amount: 99.99,
        payment_method: 'Card',
      });

      expect(posthog.capture).toHaveBeenCalledWith('expense_created', {
        source: 'manual',
        payment_method: 'Card',
      });
    });
  });

  describe('Text Length Bucket Calculator', () => {
    it('calculates correct length buckets without saving text', () => {
      expect(getLengthBucket('Short query')).toBe('<50');
      expect(getLengthBucket('A'.repeat(50))).toBe('50-200');
      expect(getLengthBucket('A'.repeat(200))).toBe('50-200');
      expect(getLengthBucket('A'.repeat(201))).toBe('>200');
    });
  });

  describe('SPA Page View Tracking', () => {
    it('sanitizes query parameters and hash fragments from route path', () => {
      setConsentStatus('granted');

      trackPageView('/expenses?category=groceries&amount=500#section');

      expect(posthog.capture).toHaveBeenCalledWith('page_view', {
        path: '/expenses',
      });
    });
  });

  describe('Fail-Open Error Handling', () => {
    it('never throws even if localStorage access throws error', () => {
      vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
        throw new Error('QuotaExceededError / Restricted Access');
      });

      expect(() => getConsentStatus()).not.toThrow();
      expect(getConsentStatus()).toBe('unset');

      expect(() => getAnonymousDistinctId()).not.toThrow();
      expect(typeof getAnonymousDistinctId()).toBe('string');

      expect(() => setConsentStatus('granted')).not.toThrow();
    });

    it('swallows PostHog capture exceptions gracefully', () => {
      setConsentStatus('granted');
      vi.mocked(posthog.capture).mockImplementation(() => {
        throw new Error('Network error or PostHog unavailable');
      });

      expect(() => trackEvent('login_success', { method: 'email' })).not.toThrow();
    });
  });
});
