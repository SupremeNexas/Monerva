import { create } from 'zustand';
import { User } from '../types';
import { api, setToken } from '../api/client';
import { trackEvent } from '../services/analytics';

interface AuthState {
  user: User | null;
  authLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (idToken: string, invitedBy?: string | null) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  authLoading: true,

  login: async (credentials) => {
    try {
      const res = await api.login(credentials);
      setToken(res.token);
      if (res.refreshToken) {
        localStorage.setItem('fintech_refresh_token', res.refreshToken);
      }
      set({ user: res.user });
      trackEvent('login_success', { method: 'email' });
    } catch (err: any) {
      trackEvent('login_failed', { method: 'email', error_type: 'invalid_credentials' });
      throw err;
    }
  },

  register: async (data) => {
    const res = await api.register(data);
    setToken(res.token);
    if (res.refreshToken) {
      localStorage.setItem('fintech_refresh_token', res.refreshToken);
    }
    set({ user: res.user });
    trackEvent('signup_completed', { method: 'email' });
  },

  // Accepts the Google ID Token (credential) returned by GSI
  googleLogin: async (idToken: string, invitedBy?: string | null) => {
    const res = await api.googleLogin(idToken, invitedBy);
    setToken(res.token);
    if (res.refreshToken) {
      localStorage.setItem('fintech_refresh_token', res.refreshToken);
    }
    set({ user: res.user });
    trackEvent('login_success', { method: 'google' });
  },

  logout: () => {
    trackEvent('logout');
    setToken(null);
    localStorage.removeItem('fintech_refresh_token');
    // Revoke Google session so the picker appears fresh next login
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    set({ user: null });
  },

  checkAuth: async () => {
    set({ authLoading: true });

    const token = localStorage.getItem('fintech_token');
    const refreshToken = localStorage.getItem('fintech_refresh_token');

    // If no tokens exist at all, the user is unauthenticated.
    // Return early without firing an unauthenticated GET /api/auth/me (which causes a 401 in console).
    if (!token && !refreshToken) {
      set({ user: null, authLoading: false });
      return;
    }

    // If access token is missing but refresh token exists, attempt silent refresh first
    if (!token && refreshToken) {
      try {
        const data = await api.refreshToken(refreshToken);
        setToken(data.token);
        if (data.refreshToken) {
          localStorage.setItem('fintech_refresh_token', data.refreshToken);
        }
      } catch (_) {
        setToken(null);
        localStorage.removeItem('fintech_refresh_token');
        set({ user: null, authLoading: false });
        return;
      }
    }

    try {
      const user = await api.getMe();
      set({ user, authLoading: false });
    } catch (e: any) {
      const isUnauthorized = e?.message === 'UNAUTHORIZED' ||
        e?.message?.toLowerCase().includes('unauthorized') ||
        e?.message?.includes('401');

      if (!isUnauthorized) {
        console.warn('[Auth] Server unreachable or network error, keeping cached session state');
        set({ authLoading: false });
        return;
      }

      // Token expired — attempt silent refresh
      const rt = localStorage.getItem('fintech_refresh_token');
      if (rt) {
        try {
          const data = await api.refreshToken(rt);
          setToken(data.token);
          if (data.refreshToken) {
            localStorage.setItem('fintech_refresh_token', data.refreshToken);
          }
          const user = await api.getMe();
          set({ user, authLoading: false });
          return;
        } catch (_) {}
      }

      setToken(null);
      localStorage.removeItem('fintech_refresh_token');
      set({ user: null, authLoading: false });
    }
  },

  updateProfile: async (data: any) => {
    const res = await api.updateProfile(data);
    set({ user: res.user });
  },

  updateCurrency: async (currency) => {
    const res = await api.updateCurrency(currency);
    set((state) => ({
      user: state.user ? { ...state.user, baseCurrency: res.baseCurrency } : null
    }));
  },

  deleteAccount: async () => {
    await api.deleteAccount();
    setToken(null);
    localStorage.removeItem('fintech_refresh_token');
    localStorage.removeItem('fintech_workspace_id');
    set({ user: null });
  }
}));

export default useAuthStore;
