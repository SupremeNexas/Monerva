import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Bot, Send, Trash2, Copy, Check, BarChart3,
  PieChart as PieIcon, LineChart as LineIcon, Receipt, ArrowRight, User, FileText
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import { PaywallModal } from '../components/UI/PaywallModal';
import useAuthStore from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { trackEvent, getLengthBucket } from '../services/analytics';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Cell, PieChart, Pie, LineChart, Line, CartesianGrid 
} from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  charts?: any[];
  transactions?: any[];
  sources?: any[];
  summary?: any;
  isStreaming?: boolean;
}

const SUGGESTED_PROMPTS = [
  "How much did I spend this month?",
  "What does my loan document say about prepayment?",
  "Compare this month and last month.",
  "Show my biggest purchases.",
  "Recommend a budget limit.",
  "Find recurring subscriptions.",
  "Summarize this year's spending."
];

// Curated colors matching design philosophy
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

export default function AIAssistantPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatInput, setChatInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = user?.plan === 'PRO' || user?.email?.toLowerCase() === 'demo@example.com';
  
  // Persist chat history in localStorage for session permanence
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('fintech_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'initial',
        role: 'assistant',
        content: `Hello! I am your **AI Finance Assistant**. Ask me questions in natural language, and I will analyze your transactions, budgets, and savings goals to give you clear answers and visual charts.`
      }
    ];
  });

  // Save to localStorage when messages change
  useEffect(() => {
    localStorage.setItem('fintech_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mutation to call chat API
  const chatMutation = useMutation({
    mutationFn: (messageText: string) => 
      api.request('/ai/chat', { 
        method: 'POST', 
        body: { message: messageText } 
      }),
    onSuccess: (res) => {
      const assistantMessageId = 'msg-' + Date.now();

      // Add assistant response with isStreaming = true to trigger simulated typewriter stream
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: res.answer || res.reply,
          charts: res.charts || [],
          transactions: res.transactions || [],
          sources: res.sources || [],
          summary: res.summary || {},
          isStreaming: true
        }
      ]);
    },
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Monerva Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'AI Assistant failed to reply', 'error');
      }
    }
  });

  const handleSendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    if (!isPro) {
      setShowPaywall(true);
      return;
    }

    trackEvent('ai_assistant_used', {
      surface: 'assistant',
      prompt_length_bucket: getLengthBucket(text.trim()),
    });

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: 'user-' + Date.now(),
        role: 'user',
        content: text.trim()
      }
    ]);

    setChatInput('');
    chatMutation.mutate(text.trim());
  };

  const handleClearConversation = () => {
    if (window.confirm("Are you sure you want to clear this conversation?")) {
      setMessages([
        {
          id: 'initial',
          role: 'assistant',
          content: `Hello! I am your **AI Finance Assistant**. Ask me questions in natural language, and I will analyze your transactions, budgets, and savings goals to give you clear answers and visual charts.`
        }
      ]);
    }
  };

  const handleCopyResponse = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    showToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-4xl mx-auto space-y-4 fade-in-up">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-2 border-b border-border">
        <div className="text-left">
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-emerald-500" />
            AI Assistant
            <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-500 text-white font-bold tracking-wider uppercase shadow-sm">
              PRO
            </span>
          </h1>
          <p className="text-xs text-muted">Natural language insights grounded in your financial data.</p>
        </div>
        
        {messages.length > 1 && (
          <button 
            onClick={handleClearConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer border border-red-500/20 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Chat Messages Log Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4" data-lenis-prevent>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={msg.id} 
              className={`flex gap-3 text-left ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot Avatar Icon */}
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Block */}
              <div className={`space-y-4 max-w-[85%] ${isUser ? 'text-right' : ''}`}>
                <div className={`relative px-4 py-3 rounded-2xl text-xs leading-relaxed group
                  ${isUser 
                    ? 'bg-emerald-500 text-white font-semibold rounded-tr-none text-left' 
                    : 'bg-card border border-border text-text rounded-tl-none'
                  }
                `}>
                  {/* Typewriter message content */}
                  <TypewriterText 
                    text={msg.content} 
                    isActive={!!msg.isStreaming} 
                    onFinish={() => {
                      // Turn off streaming once complete
                      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStreaming: false } : m));
                    }}
                  />

                  {/* Copy helper */}
                  {!isUser && !msg.isStreaming && (
                    <button 
                      onClick={() => handleCopyResponse(msg.id, msg.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-gray-400 hover:text-text transition-all cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Render Charts if present and text has finished streaming */}
                {!isUser && !msg.isStreaming && msg.charts && msg.charts.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 mt-2">
                    {msg.charts.map((chart, idx) => (
                      <div key={idx} className="premium-card p-4 space-y-3">
                        <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                          {chart.type === 'pie' ? <PieIcon className="w-3.5 h-3.5 text-emerald-500" /> : chart.type === 'line' ? <LineIcon className="w-3.5 h-3.5 text-emerald-500" /> : <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />}
                          {chart.title}
                        </h4>
                        
                        <div className="h-48 w-full text-[10px]">
                          <ResponsiveContainer width="100%" height="100%">
                            {chart.type === 'pie' ? (
                              <PieChart>
                                <Pie
                                  data={chart.data}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={40}
                                  outerRadius={65}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {chart.data.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(Number(value), user?.baseCurrency)} />
                              </PieChart>
                            ) : chart.type === 'line' ? (
                              <LineChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="name" stroke="#888888" />
                                <YAxis stroke="#888888" />
                                <Tooltip formatter={(value) => formatCurrency(Number(value), user?.baseCurrency)} />
                                <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                              </LineChart>
                            ) : (
                              <BarChart data={chart.data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                                <XAxis dataKey="name" stroke="#888888" />
                                <YAxis stroke="#888888" />
                                <Tooltip formatter={(value) => formatCurrency(Number(value), user?.baseCurrency)} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                  {chart.data.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Render Transaction references if present and text finished streaming */}
                {!isUser && !msg.isStreaming && msg.transactions && msg.transactions.length > 0 && (
                  <div className="premium-card p-4 space-y-3 mt-2">
                    <h4 className="text-xs font-bold text-text flex items-center gap-1.5 border-b border-border pb-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                      Relevant Transactions
                    </h4>
                    <div className="divide-y divide-border text-[11px] max-h-48 overflow-y-auto space-y-1">
                      {msg.transactions.map((tx: any) => (
                        <div key={tx.id} className="flex justify-between items-center py-2 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors rounded-lg px-1.5">
                          <div className="text-left">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 block">{tx.title}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-wider">{tx.category} · {tx.date}</span>
                          </div>
                          <span className={`font-bold font-sans ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, user?.baseCurrency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Render Document RAG Sources if present and text finished streaming */}
                {!isUser && !msg.isStreaming && msg.sources && msg.sources.length > 0 && (
                  <div className="premium-card p-3 space-y-2 mt-2 border-emerald-500/20 bg-emerald-500/[0.02]">
                    <h4 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-emerald-500/10 pb-1">
                      <FileText className="w-3.5 h-3.5" />
                      Document Sources ({msg.sources.length})
                    </h4>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {msg.sources.map((src: any, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-500/20">
                          <FileText className="w-3 h-3 text-emerald-500" />
                          <span>{src.originalFilename || src.filename}</span>
                          {src.pageNumber ? <span className="text-emerald-600/70 font-semibold">(Page {src.pageNumber})</span> : null}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Icon */}
              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing animation indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-card border border-border text-muted px-4 py-3 rounded-2xl rounded-tl-none text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (when no chat history exist beside initial greeting) */}
      {messages.length === 1 && !chatMutation.isPending && (
        <div className="space-y-2.5 pb-2 text-left">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider pl-1">Suggested Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTED_PROMPTS.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(promptText)}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs text-gray-700 dark:text-gray-300 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] hover:text-emerald-500 text-left transition-all cursor-pointer font-medium group"
              >
                <span>{promptText}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Chat Input Form */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(chatInput);
        }}
        className="p-1 border border-border rounded-2xl bg-card flex gap-2 items-center shadow-lg focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all"
      >
        <input 
          type="text" 
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Ask AI Assistant about your expenses, savings, budgets..."
          className="flex-1 px-4 py-3.5 text-xs bg-transparent border-0 outline-none focus:ring-0 text-text placeholder-gray-400"
          disabled={chatMutation.isPending}
        />
        <button 
          type="submit" 
          className="bg-emerald-500 text-white hover:bg-emerald-600 focus:outline-none p-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center flex-shrink-0"
          disabled={!chatInput.trim() || chatMutation.isPending}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="AI Financial Assistant"
      />
    </div>
  );
}

// ── Typewriter simulation component ───────────────────────────────────────────
function TypewriterText({ text, isActive, onFinish }: { text: string; isActive: boolean; onFinish: () => void }) {
  const [displayedText, setDisplayedText] = useState(isActive ? '' : text);
  
  useEffect(() => {
    if (!isActive) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText('');
    let currentIndex = 0;
    
    // Type out characters rapidly
    const interval = setInterval(() => {
      currentIndex += 6; // print 6 chars at a time for speed
      if (currentIndex >= text.length) {
        setDisplayedText(text);
        clearInterval(interval);
        onFinish();
      } else {
        setDisplayedText(text.slice(0, currentIndex));
      }
    }, 15);

    return () => clearInterval(interval);
  }, [text, isActive]);

  // Render text with markdown-friendly formatting (simple bolding of words)
  const formatText = (input: string) => {
    return input.split('\n').map((line, lineIdx) => {
      // Bold items matching **bold**
      const parts = line.split('**');
      const renderedLine = parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="font-bold text-gray-800 dark:text-gray-100">{part}</strong>;
        }
        return part;
      });

      return (
        <span key={lineIdx} className="block min-h-[1.2em]">
          {renderedLine}
        </span>
      );
    });
  };

  return <div className="space-y-1">{formatText(displayedText)}</div>;
}
export { AIAssistantPage };
