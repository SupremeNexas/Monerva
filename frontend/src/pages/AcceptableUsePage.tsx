import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, CheckCircle, Ban } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

export default function AcceptableUsePage() {
  usePageTitle('Acceptable Use Policy');

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0b1c30] text-slate-100 p-6 md:p-12 lg:p-16">
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-normal font-serif uppercase tracking-wide" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>
              Acceptable Use Policy
            </h1>
          </div>
          <Link to="/" className="text-xs uppercase tracking-widest text-[#fdf1e1] hover:underline font-bold">
            Back to Home
          </Link>
        </header>

        <main className="space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-xl leading-relaxed text-sm text-slate-300">

          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-200 text-xs">
            <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <strong>Strict Usage Rules:</strong> Monerva is designed exclusively for lawful personal financial accounting and document retrieval. Any illegal activities, security exploitation, automated abuse, or unauthorized secret storage will result in immediate account suspension.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Prohibited Financial Secrets & Sensitive Data</h2>
            <p>
              Users are strictly forbidden from uploading or storing sensitive authentication secrets within Monerva, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li>Bank netbanking passwords, transaction passwords, or PINs</li>
              <li>Credit or debit card full numbers, PINs, CVV/CVC codes</li>
              <li>Unified Payments Interface (UPI) PINs or MPINs</li>
              <li>One-Time Passwords (OTPs) or 2FA authentication tokens</li>
              <li>Cryptocurrency wallet private keys, seed phrases, or recovery passphrases</li>
              <li>Government identification authentication keys or secrets</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. System Integrity & AI Safety</h2>
            <p>
              You agree not to engage in any activity that interferes with or disrupts the application's infrastructure or security controls:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>Prompt Injection:</strong> Attempting to craft prompts or upload crafted PDFs designed to override AI safety system instructions or bypass tenant boundaries.</li>
              <li><strong>Automated Scraping & Abuse:</strong> Employing automated bots, scrapers, or scripts to flood API endpoints, bypass rate limits, or harvest user data.</li>
              <li><strong>Malicious File Uploads:</strong> Uploading executable files, scripts, virus-laden documents, or corrupted binaries into the Financial Document Vault.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Illegal & Fraudulent Activities</h2>
            <p>
              Monerva must not be used for money laundering, terror financing, tax evasion, fraudulent expense reporting, or any unlawful financial schemes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Enforcement & Reporting</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate this Acceptable Use Policy. If you discover a vulnerability or policy violation, please report it immediately to security@monerva.app.
            </p>
          </section>

        </main>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Last revised: September 2026. Version 1.0. Monerva Compliance Team.
        </footer>
      </div>
    </div>
  );
}
