import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie as CookieIcon, ShieldCheck, ShieldAlert } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';
import { getConsentStatus, setConsentStatus, ConsentStatus } from '../services/analytics';

export default function CookiePage() {
  usePageTitle('Cookie & Storage Policy');

  const [consent, setConsentState] = useState<ConsentStatus>('unset');

  useEffect(() => {
    setConsentState(getConsentStatus());
  }, []);

  const handleToggleConsent = (status: 'granted' | 'denied') => {
    setConsentStatus(status);
    setConsentState(status);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0b1c30] text-slate-100 p-6 md:p-12 lg:p-16">
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-normal font-serif uppercase tracking-wide" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>
              Cookie & Local Storage Policy
            </h1>
          </div>
          <Link to="/" className="text-xs uppercase tracking-widest text-[#fdf1e1] hover:underline font-bold">
            Back to Home
          </Link>
        </header>

        <main className="space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-xl leading-relaxed text-sm text-slate-300">

          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3 text-blue-200 text-xs">
            <CookieIcon className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Privacy-First Storage & Analytics:</strong> Monerva uses local web storage strictly for authentication token management, workspace preference selection, and optional privacy-sanitized product analytics. We do NOT use third-party advertising cookies or cross-site tracking pixels.
            </div>
          </div>

          <section className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Product Analytics Preferences
            </h2>
            <p className="text-xs text-slate-300">
              Product analytics helps us understand feature adoption and application performance. Monerva strictly enforces <strong>zero financial data capture</strong> — no amounts, transaction notes, merchant titles, budget limits, user names, or document contents are ever transmitted.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleToggleConsent('granted')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  consent === 'granted'
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                Allow Product Analytics
              </button>
              <button
                type="button"
                onClick={() => handleToggleConsent('denied')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  consent === 'denied'
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300'
                }`}
              >
                Opt Out of Analytics
              </button>
              <span className="text-xs text-slate-400">
                Current status: <strong className="text-white uppercase font-mono">{consent}</strong>
              </span>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. What Storage Technologies We Use</h2>
            <p>
              Monerva utilizes browser <code>localStorage</code> to maintain your login session across page refreshes, store user UI preferences, and optionally store privacy-sanitized analytics preferences. Monerva does not set HTTP-only tracking or session cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Inventory of Local Storage Keys</h2>
            <div className="overflow-x-auto border border-white/10 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/10 text-white uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Key Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">fintech_token</td>
                    <td className="p-3">Strictly Necessary</td>
                    <td className="p-3">JWT bearer token for authorizing API calls</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">fintech_refresh_token</td>
                    <td className="p-3">Strictly Necessary</td>
                    <td className="p-3">Secure refresh token for maintaining user authentication</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">fintech_workspace_id</td>
                    <td className="p-3">Preference</td>
                    <td className="p-3">Persists active workspace context selection</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">monerva_analytics_consent</td>
                    <td className="p-3">Analytics Preference</td>
                    <td className="p-3">Stores user opt-in or opt-out choice for product analytics</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">monerva_analytics_distinct_id</td>
                    <td className="p-3">Product Analytics</td>
                    <td className="p-3">Pseudonymous random distinct ID for aggregate performance analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Managing & Clearing Storage</h2>
            <p>
              You can clear local storage at any time via your browser developer tools or settings. Logging out of Monerva automatically clears your authentication token keys from your browser's local storage.
            </p>
          </section>

        </main>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Last revised: September 2026. Version 1.0. Monerva Infrastructure Team.
        </footer>
      </div>
    </div>
  );
}
