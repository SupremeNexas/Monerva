import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, AlertTriangle } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

export default function TermsPage() {
  usePageTitle('Terms of Service');

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0b1c30] text-slate-100 p-6 md:p-12 lg:p-16">
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-normal font-serif uppercase tracking-wide" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>
              Terms of Service
            </h1>
          </div>
          <Link to="/" className="text-xs uppercase tracking-widest text-[#fdf1e1] hover:underline font-bold">
            Back to Home
          </Link>
        </header>

        <main className="space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-xl leading-relaxed text-sm text-slate-300">

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-3 text-emerald-200 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong>Important Notice & Service Scope:</strong> Finova is a personal financial ledger and information management software tool. Finova is <strong>NOT</strong> a bank, non-banking financial company (NBFC), payment system operator, money transmitter, or licensed financial advisor. Finova does not hold customer funds, execute money transfers, or provide professional investment advice.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Agreement to Terms</h2>
            <p>
              By registering an account, accessing, or using Finova (operated under configuration by [LEGAL_ENTITY_NAME_REQUIRED]), you agree to be bound by these Terms of Service, our <Link to="/privacy" className="text-emerald-400 underline">Privacy Policy</Link>, <Link to="/acceptable-use" className="text-emerald-400 underline">Acceptable Use Policy</Link>, and <Link to="/ai-disclaimer" className="text-emerald-400 underline">AI Disclaimer</Link>. If you do not agree to these terms, you must not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Eligibility & Account Responsibilities</h2>
            <p>
              You must be at least 18 years of age (or the legal age of majority in your jurisdiction) to register an account. You are responsible for maintaining the confidentiality of your authentication credentials (including email/password combinations and Google OAuth sessions) and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Record-Keeping vs Monetary Settlement</h2>
            <p>
              Finova provides manual and automated record-keeping features, including transaction logging, budget tracking, subscription alerts, friend debt calculations, group expense splitting, and receipt scanning. All calculations and balances displayed within Finova are for information tracking purposes only. Finova does not process payment transactions or transfer funds between accounts or users. Actual debt settlements must be executed independently outside the software.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Artificial Intelligence & Document RAG Services</h2>
            <p>
              Finova incorporates AI features, including receipt OCR processing (via Google Gemini Vision) and Financial Document Vault retrieval (via local text embeddings and Gemini text generation).
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
              <li><strong>OCR & Scanning Accuracy:</strong> AI-extracted values from receipts or bills are automated suggestions and may contain errors. You are strictly required to verify merchant names, dates, taxes, and amounts before saving transactions.</li>
              <li><strong>Document Vault Uploads:</strong> PDF documents uploaded into the Financial Vault are processed, chunked, and stored as vector embeddings in our database to enable document search. You retain ownership of all uploaded content.</li>
              <li><strong>Prompt Injection Prohibitions:</strong> You agree not to upload malicious documents or craft inputs designed to bypass system safety controls or extract unauthorized contextual data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">5. Prohibited Financial Secrets</h2>
            <p>
              You must <strong>NEVER</strong> input, upload, or transmit sensitive authentication credentials into Finova, including: bank passwords, netbanking PINs, UPI PINs, credit/debit card PINs, CVV/CVC numbers, OTPs, seed phrases, private keys, or national identity authentication secrets (e.g. Aadhaar OTP/PAN credentials). Finova will never request or store these secrets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">6. Account Termination & Data Erasure</h2>
            <p>
              You may terminate your account at any time via the Profile settings page. Choosing "Delete Account" initiates an immediate, automated erasure of your personal data, transaction ledgers, uploaded documents, vector chunks, and AI conversation context from our active database.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Finova and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising out of your access to or use of the application, AI-generated outputs, or manual data inputs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">8. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable legal frameworks, subject to legal entity registration and jurisdiction of [LEGAL_ENTITY_NAME_REQUIRED].
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">9. Grievance & Support Contact</h2>
            <p>
              For legal inquiries, terms compliance, or privacy grievances, please contact our designated team:
            </p>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1 font-mono">
              <p>Legal Entity: [LEGAL_ENTITY_NAME_REQUIRED]</p>
              <p>Address: [REGISTERED_ADDRESS_REQUIRED]</p>
              <p>Grievance Officer: [GRIEVANCE_OFFICER_NAME_REQUIRED]</p>
              <p>Contact Email: grievance@finova.app</p>
            </div>
          </section>
        </main>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Last revised: September 2026. Version 1.0. [LEGAL_ENTITY_NAME_REQUIRED].
        </footer>
      </div>
    </div>
  );
}
