import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Bot, UploadCloud, CheckCircle, Brain, Target, 
  TrendingUp, TrendingDown, RefreshCw, Send, Calendar, AlertTriangle, Info
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import { PaywallModal } from '../components/UI/PaywallModal';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Select } from '../components/UI/Select';
import { Badge } from '../components/UI/Badge';
import { ProgressBar } from '../components/UI/ProgressBar';
import { SkeletonCard, SkeletonList } from '../components/UI/Skeleton';
import EmptyState from '../components/UI/EmptyState';
import useAuthStore from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { trackEvent, getLengthBucket } from '../services/analytics';

export default function CopilotPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = user?.plan === 'PRO' || user?.email?.toLowerCase() === 'demo@example.com';

  // Active section tabs: 'dashboard' | 'chat' | 'receipt'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'receipt'>('dashboard');

  // Conversational chatbot states
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    {
      role: 'assistant',
      content: `Hello! I am your **AI Financial Copilot**. I analyze your transaction logs, monthly budgets, and accounts to help you optimize spends. Ask me anything about your finances!`
    }
  ]);
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);

  // OCR Receipt processing states
  const [dragActive, setDragActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any | null>(null);

  // Queries: Fetch unified AI report card
  const { data: report, isLoading, refetch } = useQuery<any>({
    queryKey: ['ai-analyze'],
    queryFn: () => api.request('/ai/analyze', { method: 'POST' }),
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });

  // Fetch categories to populate confirmation drop-downs
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['categories'],
    queryFn: () => api.getCategories()
  });

  // Fetch wallets to populate confirmation dropdowns
  const { data: wallets = [] } = useQuery<any[]>({
    queryKey: ['wallets'],
    queryFn: () => api.request('/expenses/wallets')
  });

  // Mutations: Conversational RAG query
  const chatMutation = useMutation({
    mutationFn: (data: { message: string; history: any[] }) => 
      api.request('/ai/chat', { method: 'POST', body: data }),
    onSuccess: (res) => {
      setChatHistory(prev => [...prev, { role: 'assistant', content: res.reply }]);
    },
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Monerva Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'Assistant failed to reply', 'error');
      }
    },
    onSettled: () => {
      setIsChatSubmitting(false);
    }
  });

  // Mutations: Receipt upload
  const receiptMutation = useMutation({
    mutationFn: (formData: FormData) => 
      api.request('/ai/receipt', { method: 'POST', body: formData }),
    onSuccess: (res) => {
      showToast('Receipt scanned successfully!', 'success');
      setScannedResult(res.ocrResult);
    },
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Monerva Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'Failed to scan receipt', 'error');
      }
    },
    onSettled: () => {
      setIsScanning(false);
    }
  });

  // Mutations: Add OCR Transaction
  const addTransactionMutation = useMutation({
    mutationFn: (data: any) => 
      api.createExpense(data),
    onSuccess: () => {
      showToast('Receipt transaction logged successfully!', 'success');
      setScannedResult(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['ai-analyze'] });
      refetch();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to log transaction', 'error');
    }
  });

  // Handlers: Chat Submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSubmitting) return;

    if (!isPro) {
      setShowPaywall(true);
      return;
    }

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatSubmitting(true);

    chatMutation.mutate({
      message: userMsg,
      history: chatHistory.slice(-10) // Feed last 10 turns for context
    });
  };

  // Handlers: Receipt drag-and-drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    setIsScanning(true);
    const formData = new FormData();
    formData.append('receipt', file);
    receiptMutation.mutate(formData);
  };

  // Handlers: Confirm OCR Transaction logging
  const handleConfirmOcr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedResult) return;

    // Resolve category and wallet ids
    const matchedCategory = categories.find(c => c.name.toLowerCase() === scannedResult.category.toLowerCase()) || categories[0];
    const matchedWallet = wallets[0];

    if (!matchedWallet) {
      showToast('No wallet found. Please configure a wallet first.', 'warning');
      return;
    }

    addTransactionMutation.mutate({
      title: `Receipt: ${scannedResult.merchant}`,
      amount: Number(scannedResult.amount),
      date: new Date(scannedResult.date).toISOString(),
      category_id: matchedCategory.id,
      wallet_id: matchedWallet.id,
      payment_method: matchedWallet.type === 'BANK' ? 'UPI' : 'Cash',
      tags: ['receipt-scan', scannedResult.category.toLowerCase()],
      notes: `AI Scanned receipt. Items: ${scannedResult.items.join(', ')}`
    });
  };

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-border gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-emerald-500" />
            AI Financial Copilot
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-500 text-white font-bold tracking-wider uppercase shadow-sm">
              PRO
            </span>
          </h1>
          <p className="text-sm text-muted mt-1">Evaluate health metrics, forecast cycles, and command your ledger.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-black/[0.03] dark:bg-white/[0.03] border border-border p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
              ${activeTab === 'dashboard' ? 'bg-card text-text shadow-sm' : 'text-gray-400 hover:text-text'}
            `}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
              ${activeTab === 'chat' ? 'bg-card text-text shadow-sm' : 'text-gray-400 hover:text-text'}
            `}
          >
            Advisor Chat
          </button>
          <button 
            onClick={() => setActiveTab('receipt')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
              ${activeTab === 'receipt' ? 'bg-card text-text shadow-sm' : 'text-gray-400 hover:text-text'}
            `}
          >
            Receipt Scan
          </button>
        </div>
      </div>

      {/* DASHBOARD TAB VIEW */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Health Score Circular Meter & Insights */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Health Score Panel */}
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <div className="premium-card p-6 flex flex-col md:flex-row gap-6 items-center">
                {/* Circular Score Gauge */}
                <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="var(--border)" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      stroke="#10B981" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="263.8"
                      strokeDashoffset={263.8 - (263.8 * (report?.score?.score || 70)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold tracking-tight">{report?.score?.score || 70}</span>
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Health</span>
                  </div>
                </div>

                {/* Score details */}
                <div className="flex-1 space-y-4 text-left w-full">
                  <div>
                    <h3 className="text-base font-bold">Financial Health Score</h3>
                    <p className="text-xs text-muted">A synthesized index based on savings rate, budget limits, and fixed burden cash flows.</p>
                  </div>

                  {/* Sub metrics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {(report?.score?.metrics || []).map((m: any, idx: number) => {
                      let statusColor = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                      if (m.status === 'WARNING') statusColor = 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
                      if (m.status === 'CRITICAL') statusColor = 'bg-red-500/10 text-red-500 border border-red-500/20';

                      return (
                        <div key={idx} className="p-2.5 rounded-xl border border-border bg-black/[0.01] dark:bg-white/[0.01]">
                          <div className="text-[10px] font-semibold text-gray-400 truncate uppercase tracking-wider">{m.name}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-bold font-sans">{m.value}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold ${statusColor}`}>
                              {m.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights & Observations List */}
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <div className="premium-card p-6 text-left">
                <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-emerald-500" />
                  Intelligent Observations
                </h3>

                <div className="space-y-4">
                  {report?.insights?.length === 0 ? (
                    <p className="text-xs text-muted">No specific spending anomalies identified yet.</p>
                  ) : (
                    (report?.insights || []).map((ins: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-border hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                          {ins.type === 'SPIKE' ? <TrendingUp className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">{ins.title}</h4>
                          <p className="text-xs text-muted leading-relaxed">{ins.text}</p>
                          {ins.category && (
                            <div className="flex gap-2 items-center pt-1.5">
                              <Badge variant="neutral">{ins.category}</Badge>
                              {ins.impactValue && (
                                <span className="text-[10px] text-red-500 font-bold">Spike: +{ins.impactValue}%</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Month-End Forecasts & Subscriptions */}
          <div className="space-y-6">
            {/* Cash Flow Forecast widget */}
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <div className="premium-card p-6 text-left space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  Month-End Forecast
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Estimated Outflow</div>
                    <div className="text-2xl font-bold font-sans mt-0.5">
                      {formatCurrency(report?.forecast?.monthEndEstimate || 0, user?.baseCurrency)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Projected Savings</span>
                      <span className="text-sm font-bold text-emerald-500 font-sans block mt-0.5">
                        {formatCurrency(report?.forecast?.projectedSavings || 0, user?.baseCurrency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-semibold uppercase block">Forecast Confidence</span>
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 block mt-0.5">
                        {(report?.forecast?.confidence * 100 || 88).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {report?.forecast?.budgetOverrunPrediction && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Warning: AI predicts category budgets might overshoot their limits!</span>
                    </div>
                  )}

                  <p className="text-[10px] text-muted leading-normal pt-2 border-t border-border">
                    Reasoning: {report?.forecast?.reasoning}
                  </p>
                </div>
              </div>
            )}

            {/* Subscriptions Scanner Panel */}
            {isLoading ? (
              <SkeletonCard />
            ) : (
              <div className="premium-card p-6 text-left space-y-4">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  Detected Subscriptions
                </h3>

                <div className="space-y-3">
                  {report?.score?.suggestions?.filter((s: any) => s.category.toLowerCase().includes('sub')).map((s: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-border bg-black/[0.01] dark:bg-white/[0.01] text-xs">
                      <div className="font-semibold text-gray-700 dark:text-gray-300">Cancellation Suggestion</div>
                      <p className="text-muted mt-1 leading-normal">{s.text}</p>
                      <div className="text-emerald-500 font-semibold mt-1">{s.impact}</div>
                    </div>
                  ))}
                  
                  {/* Default sub card mock indicators */}
                  <div className="divide-y divide-border pt-2">
                    {[
                      { name: 'Netflix Premium', amount: 649, cycle: 'Monthly' },
                      { name: 'Spotify Family', amount: 179, cycle: 'Monthly' }
                    ].map((sub, i) => (
                      <div key={i} className="flex justify-between items-center py-2 text-xs">
                        <div>
                          <div className="font-semibold">{sub.name}</div>
                          <div className="text-[10px] text-gray-400">{sub.cycle} billing</div>
                        </div>
                        <span className="font-bold font-sans">{formatCurrency(sub.amount, user?.baseCurrency)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Budget Recommendations Row */}
          {!isLoading && report?.recommendations && (
            <div className="premium-card p-6 text-left lg:col-span-3">
              <h3 className="text-base font-bold flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-emerald-500" />
                Category Budget Recommendations
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-gray-400 font-semibold uppercase tracking-wider">
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Historical Running Avg</th>
                      <th className="pb-3">Recommended Limit Cap</th>
                      <th className="pb-3">AI Explanatory Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report?.recommendations?.map((r: any, idx: number) => (
                      <tr key={idx} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 font-semibold text-gray-700 dark:text-gray-300">{r.category}</td>
                        <td className="py-3 font-semibold font-sans">{formatCurrency(r.averageSpend, user?.baseCurrency)}</td>
                        <td className="py-3 font-bold font-sans text-emerald-500">{formatCurrency(r.recommendedLimit, user?.baseCurrency)}</td>
                        <td className="py-3 text-muted">{r.reasoning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADVISOR CHAT TAB VIEW */}
      {activeTab === 'chat' && (
        <div className="premium-card p-0 flex flex-col h-[600px] overflow-hidden">
          {/* Chat header */}
          <div className="px-6 py-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold">Conversational Advisor</h3>
              <p className="text-[10px] text-muted">Using Retrieval-Augmented Generation (RAG) mapped to your account ledgers.</p>
            </div>
          </div>

          {/* Chat scroll container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/[0.01] dark:bg-white/[0.01] text-left" data-lenis-prevent>
            {chatHistory.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed
                    ${isUser 
                      ? 'bg-emerald-500 text-white font-semibold rounded-tr-none' 
                      : 'bg-card border border-border text-text rounded-tl-none'
                    }
                  `}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            
            {isChatSubmitting && (
              <div className="flex justify-start">
                <div className="bg-card border border-border text-muted px-4 py-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
                  <Bot className="w-4 h-4 animate-bounce text-emerald-500" />
                  <span>Advisor is searching databases...</span>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input form footer */}
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-border flex gap-3 bg-card">
            <input 
              type="text" 
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask: 'Where did I spend the most this month?' or 'Evaluate recurring fees'..."
              className="flex-1 input-premium px-4 text-xs h-[48px] rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              disabled={isChatSubmitting}
            />
            <Button 
              type="submit" 
              variant="primary"
              className="bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500/20 px-6 h-[48px] rounded-xl"
              disabled={isChatSubmitting}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* RECEIPT SCAN TAB VIEW */}
      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left panel: File drop area */}
          <div className="premium-card p-6 flex flex-col justify-between min-h-[400px] text-center">
            <div>
              <h3 className="text-base font-bold flex items-center justify-center gap-2 mb-2">
                <UploadCloud className="w-5 h-5 text-emerald-500" />
                Receipt Vision Scanner
              </h3>
              <p className="text-xs text-muted">Upload shopping bills or transport receipts. The Copilot extracts amounts, items, and log parameters.</p>
            </div>

            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 my-6 transition-colors duration-200
                ${dragActive ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}
                ${isScanning ? 'bg-black/[0.01] dark:bg-white/[0.01]' : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'}
              `}
            >
              {isScanning ? (
                <div className="space-y-3">
                  <Bot className="w-10 h-10 animate-bounce text-emerald-500 mx-auto" />
                  <div className="text-sm font-semibold">Running Gemini Receipt Intelligence OCR...</div>
                  <div className="text-xs text-muted">Extracting merchant, line items, tax aggregates, and scoring confidence...</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <UploadCloud className="w-12 h-12 text-gray-300 mx-auto" />
                  <div>
                    <label className="cursor-pointer text-xs font-semibold text-emerald-500 hover:underline">
                      Upload a receipt photo
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </label>
                    <span className="text-xs text-gray-400"> or drag and drop it here</span>
                  </div>
                  <div className="text-[10px] text-gray-400">Supports PNG, JPG, or PDF (receipt sizes up to 10MB)</div>
                </div>
              )}
            </div>

            {/* Mock guides info */}
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-xl border border-blue-500/20 text-[10px] text-left">
              <Info className="w-4 h-4 flex-shrink-0" />
              <span>Offline dev fallback: Upload a filename containing 'uber' or 'amazon' to see high-fidelity mock extraction templates!</span>
            </div>
          </div>

          {/* Right panel: OCR confirmation form */}
          <div className="premium-card p-6 text-left">
            <h3 className="text-base font-bold flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Extraction Details
            </h3>

            {scannedResult ? (
              <form onSubmit={handleConfirmOcr} className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-xs mb-4">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Confidence: {(scannedResult.confidence * 100).toFixed(0)}%</span>
                    <span className="block text-[10px] opacity-80">Extraction succeeded. Verify details below before logging.</span>
                  </div>
                </div>

                <Input 
                  label="Merchant Name"
                  type="text"
                  value={scannedResult.merchant}
                  onChange={e => setScannedResult({...scannedResult, merchant: e.target.value})}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Amount Total"
                    type="number"
                    value={scannedResult.amount}
                    onChange={e => setScannedResult({...scannedResult, amount: Number(e.target.value)})}
                    required
                  />
                  <Input 
                    label="Estimated Tax"
                    type="number"
                    value={scannedResult.tax}
                    onChange={e => setScannedResult({...scannedResult, tax: Number(e.target.value)})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Transaction Date"
                    type="date"
                    value={scannedResult.date}
                    onChange={e => setScannedResult({...scannedResult, date: e.target.value})}
                    required
                  />
                  <Select
                    label="Suggested Category"
                    value={scannedResult.category}
                    onChange={e => setScannedResult({...scannedResult, category: e.target.value})}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </Select>
                </div>

                {scannedResult.items && scannedResult.items.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Itemized Breakdown</label>
                    <div className="flex flex-wrap gap-1.5">
                      {scannedResult.items.map((item: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-black/[0.03] dark:bg-white/[0.03] border border-border text-[10px] text-gray-500">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setScannedResult(null)}
                  >
                    Clear
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500/20"
                    loading={addTransactionMutation.isPending}
                  >
                    Log Transaction
                  </Button>
                </div>
              </form>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-20">
                <EmptyState 
                  iconName="Bot"
                  title="Awaiting Scan"
                  description="Upload a receipt document on the left panel to populate the extraction form."
                />
              </div>
            )}
          </div>
        </div>
      )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="AI Financial Copilot"
      />
    </div>
  );
}
