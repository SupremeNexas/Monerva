import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, Trash2 } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

export default function PrivacyPage() {
  usePageTitle('Privacy Policy');

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0b1c30] text-slate-100 p-6 md:p-12 lg:p-16">
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-normal font-serif uppercase tracking-wide" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>
              Privacy Policy
            </h1>
          </div>
          <Link to="/" className="text-xs uppercase tracking-widest text-[#fdf1e1] hover:underline font-bold">
            Back to Home
          </Link>
        </header>

        <main className="space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-xl leading-relaxed text-sm text-slate-300">

          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-3 text-indigo-200 text-xs">
            <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong>Privacy Protection Commitment:</strong> Finova collects only the data necessary to deliver personal finance accounting, receipt scanning, and document retrieval. We do not sell your personal financial records to third-party ad networks or data brokers.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. Data Collected & Purpose</h2>
            <p>
              We collect data strictly to provide financial tracking services:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>Identity Data:</strong> Name, display name, email address, profile picture URL (if using Google OAuth), country, base currency, and timezone.</li>
              <li><strong>Financial Ledgers:</strong> Transaction amounts, categories, dates, payment method tags, notes, wallets, credit cards, budgets, savings goals, recurring bills, and subscriptions.</li>
              <li><strong>Social & Shared Ledgers:</strong> Friend connections, group memberships, shared expense splits, and debt balances.</li>
              <li><strong>Uploaded Content & RAG Vault:</strong> PDF financial documents uploaded to the Financial Vault are processed into extracted text and 384-dimensional vector embeddings stored in PostgreSQL to enable user-initiated semantic document search.</li>
              <li><strong>AI Query Data:</strong> Questions submitted to the AI Assistant and receipt images uploaded for OCR extraction are processed via Google Gemini API to extract financial data structures.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Third-Party Data Transfers</h2>
            <p>
              To operate Finova technically, certain data is processed through essential infrastructure providers:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs">
                <h3 className="font-bold text-white text-sm">Google OAuth & Identity</h3>
                <p className="text-slate-300">Verifies user identity ID tokens. Only profile email, sub ID, name, and avatar are received.</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs">
                <h3 className="font-bold text-white text-sm">Google Gemini AI</h3>
                <p className="text-slate-300">Processes receipt images for OCR and queries document chunks to construct RAG answers. Data sent is transient and scoped to your request.</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs">
                <h3 className="font-bold text-white text-sm">Supabase / PostgreSQL</h3>
                <p className="text-slate-300">Database server storing application tables, isolated workspaces, transactions, and document vector embeddings with transport encryption.</p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-1 text-xs">
                <h3 className="font-bold text-white text-sm">Vercel & Render</h3>
                <p className="text-slate-300">Host the frontend single-page application and Express API server with TLS/HTTPS standard transport security.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Security Safeguards</h2>
            <p>
              We implement reasonable technical and organizational measures to safeguard your personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
              <li>TLS/HTTPS encrypted communication for all API endpoints.</li>
              <li>Strict server-side JWT authentication and workspace tenant authorization.</li>
              <li>Rate limiting on authentication and AI endpoints to prevent brute-force and resource abuse.</li>
              <li>In-process PDF parsing and magic-bytes file validation for upload security.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Data Retention & Account Erasure</h2>
            <p>
              We retain active user data as long as your account remains active. You hold full control over your data.
            </p>
            <p>
              <strong>Right to Erasure / Deletion:</strong> You can permanently delete your account and all associated personal financial records, receipts, uploaded PDF vault documents, vector embeddings, and AI chat context directly inside the application via <em>Profile &gt; Danger Zone &gt; Delete Account</em>. Deletion is immediate and irreversible.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">5. Digital Personal Data Protection (DPDP) Readiness</h2>
            <p>
              For users in India, our processing operates in accordance with principles under applicable personal data protection laws (including the Digital Personal Data Protection Act 2023):
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
              <li><strong>Notice & Consent:</strong> We display clear notice and obtain affirmative consent during account creation.</li>
              <li><strong>Purpose Limitation:</strong> Data is processed exclusively to provide financial ledger, scanning, and document search tools requested by you.</li>
              <li><strong>Right to Withdraw Consent & Request Erasure:</strong> You can delete your account at any time.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">6. Contact & Grievance Redressal</h2>
            <p>
              If you have questions, privacy concerns, or data erasure requests, please contact our designated Grievance Team:
            </p>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1 font-mono">
              <p>Legal Entity: [LEGAL_ENTITY_NAME_REQUIRED]</p>
              <p>Address: [REGISTERED_ADDRESS_REQUIRED]</p>
              <p>Grievance Officer: [GRIEVANCE_OFFICER_NAME_REQUIRED]</p>
              <p>Email: grievance@finova.app</p>
            </div>
          </section>

        </main>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Last revised: September 2026. Version 1.0. Finova Security & Privacy.
        </footer>
      </div>
    </div>
  );
}
