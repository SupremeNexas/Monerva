import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode?: string) => void;
          'expired-callback'?: () => void;
          'timeout-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
          'response-field'?: boolean;
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onloadTurnstileCallback?: () => void;
  }
}

export interface TurnstileWidgetRef {
  reset: () => void;
  remove: () => void;
}

interface TurnstileWidgetProps {
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: string) => void;
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

const DEFAULT_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || '0x4AAAAAAEykKdNrTGP2Ib_Z';
const TEST_SITE_KEY = '1x00000000000000000000AA';

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(({
  onSuccess,
  onExpire,
  onError,
  siteKey,
  theme = 'light',
  className = ''
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'verified' | 'error' | 'expired'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeSiteKey = siteKey || DEFAULT_SITE_KEY || TEST_SITE_KEY;

  useImperativeHandle(ref, () => ({
    reset: () => {
      const isTestEnv = import.meta.env.MODE === 'test' || (typeof window.turnstile === 'undefined' && typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
      if (isTestEnv) {
        setStatus('verified');
        setErrorMessage(null);
        onSuccess('test-valid-token');
        return;
      }

      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setStatus('ready');
          setErrorMessage(null);
        } catch (e) {
          console.warn('[Turnstile Widget] Reset failed:', e);
        }
      }
    },
    remove: () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch (e) {}
      }
    }
  }));

  const renderWidget = () => {
    if (!containerRef.current || !window.turnstile) return;

    // Remove old widget if already rendered
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (_) {}
      widgetIdRef.current = null;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: activeSiteKey,
        theme,
        size: 'normal',
        callback: (token: string) => {
          setStatus('verified');
          setErrorMessage(null);
          onSuccess(token);
        },
        'expired-callback': () => {
          setStatus('expired');
          if (onExpire) onExpire();
        },
        'timeout-callback': () => {
          setStatus('expired');
          if (onExpire) onExpire();
        },
        'error-callback': (errorCode?: string) => {
          setStatus('error');
          const msg = errorCode ? `Security challenge failed (${errorCode}).` : 'Security challenge failed.';
          setErrorMessage(msg);
          if (onError) onError(msg);
        }
      });

      widgetIdRef.current = id;
      setStatus('ready');
    } catch (err: any) {
      console.error('[Turnstile Widget] Render error:', err);
      setStatus('error');
      setErrorMessage('Failed to initialize security challenge.');
    }
  };

  useEffect(() => {
    // If in automated test environment (JSDOM / Vitest) where script cannot load from Cloudflare CDN
    const isTestEnv = import.meta.env.MODE === 'test' || (typeof window.turnstile === 'undefined' && typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
    if (isTestEnv) {
      setStatus('verified');
      onSuccess('test-valid-token');
      return;
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Load Cloudflare Turnstile script dynamically
    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    window.onloadTurnstileCallback = () => {
      renderWidget();
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setStatus('error');
        setErrorMessage('Could not load security verification script. Check network connection.');
        if (onError) onError('Network error loading security check script.');
      };
      document.head.appendChild(script);
    } else {
      // Script tag exists, poll for window.turnstile availability
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!window.turnstile && status === 'loading') {
          setStatus('error');
          setErrorMessage('Security verification timed out loading.');
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (_) {}
      }
    };
  }, [activeSiteKey]);

  const handleRetry = () => {
    setStatus('loading');
    setErrorMessage(null);
    if (window.turnstile && containerRef.current) {
      renderWidget();
    } else {
      // Reload script if missing
      window.location.reload();
    }
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center my-3 ${className}`}>
      {status === 'loading' && (
        <div className="w-full h-[65px] rounded-2xl border border-gray-200 bg-gray-50/70 flex items-center justify-center gap-2 text-xs font-medium text-gray-500 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          <span>Initializing security check...</span>
        </div>
      )}

      {status === 'error' && (
        <div className="w-full p-3 rounded-2xl border border-red-200 bg-red-50/80 flex items-center justify-between gap-2 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage || 'Security check error'}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-2.5 py-1 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-semibold transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'expired' && (
        <div className="w-full p-3 rounded-2xl border border-amber-200 bg-amber-50/80 flex items-center justify-between gap-2 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Security token expired. Please re-verify.</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold transition-colors cursor-pointer shrink-0"
          >
            Re-verify
          </button>
        </div>
      )}

      {/* Target container for Cloudflare Turnstile explicit render */}
      <div
        ref={containerRef}
        data-testid="turnstile-container"
        className={`w-full flex justify-center ${status === 'error' || status === 'loading' ? 'hidden' : 'block'}`}
      />
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
