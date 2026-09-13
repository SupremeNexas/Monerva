import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bot, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import usePageTitle from '../hooks/usePageTitle';

export default function AIDisclaimerPage() {
  usePageTitle('AI & Financial Disclaimer');

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0b1c30] text-slate-100 p-6 md:p-12 lg:p-16">
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2.5 rounded-full hover:bg-white/10 text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-normal font-serif uppercase tracking-wide" style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}>
              AI & Financial Disclaimer
            </h1>
          </div>
          <Link to="/" className="text-xs uppercase tracking-widest text-[#fdf1e1] hover:underline font-bold">
            Back to Home
          </Link>
        </header>

        <main className="space-y-8 bg-white/5 border border-white/10 backdrop-blur-xl p-8 rounded-2xl shadow-xl leading-relaxed text-sm text-slate-300">

          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>No Licensed Financial Advice:</strong> Monerva and its AI services provide automated data organization, calculation, and document retrieval. Monerva is <strong>NOT</strong> a certified financial planner, tax advisor, or investment professional. AI outputs do not constitute formal financial, tax, or legal advice.
            </div>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">1. AI Receipt & Bill OCR Scanning</h2>
            <p>
              Monerva utilizes multimodal artificial intelligence models (Google Gemini Vision) to parse uploaded receipt images and extract draft transaction fields (merchant name, date, total amount, tax, items, and category).
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>OCR Verification Requirement:</strong> AI extraction is an automated convenience feature and is not guaranteed to be 100% accurate. Image quality, lighting, handwriting, or damaged receipts can affect OCR results.</li>
              <li><strong>User Responsibility:</strong> You are strictly responsible for reviewing and verifying all extracted figures, merchant titles, and dates before submitting transactions to your ledger.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">2. Financial Document Vault & RAG Search</h2>
            <p>
              The Financial Document Vault extracts text from uploaded PDF documents and generates 384-dimensional vector embeddings to answer your questions through Retrieval-Augmented Generation (RAG).
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-2">
              <li><strong>Grounded Document Answers:</strong> The AI Assistant strictly limits document responses to extracted text context inside uploaded PDFs.</li>
              <li><strong>Not Official Legal/Contractual Interpretation:</strong> Answers provided by the AI Assistant about loan contracts, tax forms, or insurance policies are simplified text summaries and must not replace official legal or professional review.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">3. Financial Assistant Insights & Calculations</h2>
            <p>
              Monerva's AI Assistant performs database analytics over your recorded expenses and income. All totals, category spending percentages, and budget comparisons are derived directly from your transaction database using exact mathematical queries. The AI Assistant generates narrative summaries to explain your financial patterns.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">4. Third-Party AI Data Processing</h2>
            <p>
              When using AI features, transaction queries and uploaded document context are transmitted securely over TLS to Google Gemini API endpoints for response generation. Prompts and documents are handled strictly according to enterprise data privacy agreements and are not used to train public foundational models.
            </p>
          </section>

        </main>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Last revised: September 2026. Version 1.0. Monerva Intelligence Group.
        </footer>
      </div>
    </div>
  );
}
