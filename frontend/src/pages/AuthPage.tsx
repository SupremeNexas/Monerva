import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/UI/Toast';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import TurnstileWidget, { TurnstileWidgetRef } from '../components/UI/TurnstileWidget';

// ── Google GSI Type Declarations ──────────────────────────────────────────────
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; error?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; isDismissedMoment: () => boolean; getDismissedReason: () => string }) => void) => void;
          disableAutoSelect: () => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '357084347273-8405ggecqias20eduh7df8iv04eldtjm.apps.googleusercontent.com';

export default function AuthPage() {
  const { login, register, googleLogin } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteVal = params.get('invitedBy') || params.get('invite');
    if (inviteVal) {
      setInvitedBy(inviteVal);
      setIsLogin(false);
    }
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    baseCurrency: 'INR'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // ── Initialize GSI when script loads ────────────────────────────────────────
  const initializeGSI = useCallback(() => {
    if (!window.google?.accounts?.id) return;
    if (!GOOGLE_CLIENT_ID) {
      setGoogleError('Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env');
      return;
    }

    // Google OAuth 2.0 does not allow IP address origins like 127.0.0.1
    const currentOrigin = window.location.origin;
    if (currentOrigin.includes('127.0.0.1')) {
      setGoogleError('Google Sign-In does not support IP addresses (127.0.0.1). Please use http://localhost:5173 to access this app.');
      return;
    }

    // The default client ID is authorized for http://localhost:5173 and https://expense-tracker-eight-pi-69.vercel.app
    const defaultClientId = '357084347273-8405ggecqias20eduh7df8iv04eldtjm.apps.googleusercontent.com';
    const isDefaultClientId = GOOGLE_CLIENT_ID === defaultClientId;
    const isProductionVercel = currentOrigin.includes('vercel.app') || currentOrigin.includes('localhost');

    if (isDefaultClientId && !isProductionVercel) {
      setGoogleError(`Deployment detected: To sign in under ${currentOrigin}, register your Client ID in Google Cloud Console and set VITE_GOOGLE_CLIENT_ID in Vercel Environment Variables.`);
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      setGoogleReady(true);
      setGoogleError(null);
    } catch (err: any) {
      console.error('[Google Auth] Init error:', err);
      setGoogleError('Failed to initialize Google Sign-in.');
    }
  }, []);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      initializeGSI();
      return;
    }

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        initializeGSI();
      }
    }, 200);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.google?.accounts?.id) {
        setGoogleError('Google Sign-In failed to load. Check your internet connection.');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [initializeGSI]);

  // ── Render official Google button container ──────────────────────────────
  useEffect(() => {
    if (googleReady && window.google?.accounts?.id) {
      const btnContainer = document.getElementById('google-btn-container');
      if (btnContainer) {
        window.google.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          width: btnContainer.clientWidth || 360,
          shape: 'rectangular',
          text: 'continue_with',
          logo_alignment: 'left'
        });
      }
    }
  }, [googleReady, isLogin]);

  // ── Handle credential response from GSI popup ────────────────────────────────
  const handleGoogleCredentialResponse = async (response: { credential: string; error?: string }) => {
    if (!response.credential) {
      setGoogleLoading(false);
      showToast('Google sign-in was cancelled or failed.', 'error');
      return;
    }

    setGoogleLoading(true);
    try {
      await googleLogin(response.credential, invitedBy);
      showToast('Signed in with Google!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[Google Auth] Failed:', err);
      showToast(err.message || 'Google sign-in failed. Please try again.', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Email/Password form ───────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin) {
      if (formData.password.length < 4) {
        showToast('Password must be at least 4 characters.', 'error');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
      }
    }

    if (!turnstileToken) {
      showToast('Please complete the security check before continuing.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await login({ email: formData.email, password: formData.password, turnstileToken });
        showToast('Welcome back!', 'success');
      } else {
        await register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          baseCurrency: formData.baseCurrency,
          invitedBy,
          turnstileToken
        });
        showToast('Account created successfully!', 'success');
      }
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    if (!turnstileToken) {
      showToast('Please complete the security check before logging in with Demo.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: 'demo@example.com', password: 'password123', turnstileToken });
      showToast('Signed in with Demo Account!', 'success');
      navigate('/dashboard');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed', 'error');
      resetTurnstile();
    } finally {
      setIsLoading(false);
    }
  };

  const isAnyLoading = isLoading || googleLoading;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#FCFCFD] text-[#131517]">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-[440px] bg-white border border-[#E5E7EB] rounded-[32px] p-8 sm:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
      >
        <div className="mb-8">
          <div className="w-12 h-12 rounded-full bg-[#111113] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="3" width="4" height="18" rx="2" fill="currentColor" />
              <rect x="9" y="3" width="11" height="4" rx="2" fill="currentColor" />
              <rect x="9" y="10" width="7" height="4" rx="2" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-[#111113] mb-2 font-display">
            {isLogin ? 'Sign in to Monerva' : 'Create your account'}
          </h1>
          <p className="text-sm font-normal text-gray-600">
            {isLogin ? "We'll sign you in securely to your command center." : "Get started with intelligent account tracking today."}
          </p>
        </div>

        {/* Google error alert */}
        <AnimatePresence>
          {googleError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2 mb-6 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-medium text-red-700"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{googleError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[#18181A]">Full name</label>
                <input
                  type="text"
                  name="name"
                  className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-transparent transition-all duration-150"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[#18181A]">Base currency</label>
                <select
                  name="baseCurrency"
                  className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-transparent transition-all duration-150 cursor-pointer"
                  value={formData.baseCurrency}
                  onChange={handleChange}
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#18181A]">Email address</label>
            <input
              type="email"
              name="email"
              className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-transparent transition-all duration-150"
              placeholder="you@company.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#18181A]">Password</label>
            <input
              type="password"
              name="password"
              className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-transparent transition-all duration-150"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#18181A]">Confirm password</label>
              <input
                type="password"
                name="confirmPassword"
                className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/80 focus:border-transparent transition-all duration-150"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {/* Turnstile Security Verification Widget */}
          <TurnstileWidget
            ref={turnstileRef}
            onSuccess={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />

          <button
            type="submit"
            disabled={isAnyLoading}
            className="w-full h-[50px] mt-2 rounded-2xl bg-[#111113] hover:bg-[#202023] active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer shadow-[0_2px_10px_rgb(0,0,0,0.12)]"
          >
            {isLoading ? <span>Working...</span> : <span>{isLogin ? 'Sign in' : 'Create account'}</span>}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isAnyLoading}
              className="w-full h-[46px] mt-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Try Demo Account (1-Click Login)</span>
            </button>
          )}
        </form>

        <div className="relative my-7 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200/90" /></div>
            <span className="relative px-3 bg-white text-[11px] font-bold text-gray-500 tracking-wider">OR</span>
        </div>

        <div className="w-full flex justify-center min-h-[50px] items-center">
          <div
            id="google-btn-container"
            className="w-full flex justify-center [&>iframe]:!w-full [&>iframe]:!max-w-none"
          />
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 space-y-3">
          <p className="text-[11px] text-gray-500 leading-normal">
            By creating an account or signing in, you agree to Monerva's{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">Terms of Service</a>,{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">Privacy Policy</a>,{' '}
            <a href="/acceptable-use" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">Acceptable Use Policy</a>, and{' '}
            <a href="/ai-disclaimer" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-medium">AI Disclaimer</a>.
          </p>

          <div>
            {isLogin ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    resetTurnstile();
                  }}
                  className="text-indigo-600 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    resetTurnstile();
                  }}
                  className="text-indigo-600 font-semibold hover:underline bg-transparent border-none cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
