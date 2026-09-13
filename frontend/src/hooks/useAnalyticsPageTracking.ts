import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../services/analytics';

/**
 * Hook to automatically track SPA page/route views without double counting.
 */
export function useAnalyticsPageTracking(): void {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const currentPath = location.pathname;
      if (currentPath !== lastPathRef.current) {
        lastPathRef.current = currentPath;
        trackPageView(currentPath);
      }
    } catch (err) {
      console.warn('[Analytics Page Tracking Error]:', err);
    }
  }, [location.pathname]);
}
