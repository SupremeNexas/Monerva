import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, Sparkles, Plus,
  Bot, ScanLine, ShoppingBag,
  ShieldCheck, Swords, Receipt
} from 'lucide-react';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import { formatCurrency } from '../utils/currency';
import { useToast } from '../components/UI/Toast';
import { SkeletonCard, SkeletonChart } from '../components/UI/Skeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import StaggeredMenu from '../components/StaggeredMenu/StaggeredMenu';
import SpecularButton from '../components/UI/SpecularButton';
import FinancialAlertsBanner from '../components/Dashboard/FinancialAlertsBanner';
import { PaywallModal } from '../components/UI/PaywallModal';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const menuRef = React.useRef<any>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const isPro = user?.plan === 'PRO' || user?.email?.toLowerCase() === 'demo@example.com';

  const [quests, setQuests] = useState([
    { id: 1, title: 'Zero Spend', reward: '150XP', progress: '1/3', completed: false, rewardClaimed: false },
    { id: 2, title: 'Check In', reward: '50XP', progress: '0/1', completed: false, rewardClaimed: false },
    { id: 3, title: 'Add Ledger', reward: '100XP', progress: '1/1', completed: true, rewardClaimed: false },
    { id: 4, title: 'Scan Receipt', reward: '200XP', progress: '0/1', completed: false, rewardClaimed: false }
  ]);

  const claimQuestReward = (questId: number) => {
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, rewardClaimed: true } : q));
    showToast('REWARD CLAIMED. XP UPDATED.', 'success');
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['summary'], queryFn: () => api.getSummary() });
  const { data: trend, isLoading: trendLoading } = useQuery({ queryKey: ['trend'], queryFn: () => api.getTrend() });
  const { data: expenses, isLoading: expensesLoading } = useQuery({ queryKey: ['expenses'], queryFn: () => api.getExpenses({ take: 5 }) });
  const { data: coachData } = useQuery({ queryKey: ['coach'], queryFn: () => api.request('/ai/coach') });
  const { data: categoriesData } = useQuery({ queryKey: ['categories-pie'], queryFn: () => api.getByCategory() });

  const totalExpense = summary?.total || 0;
  const estimatedIncome = summary?.totalIncome !== undefined ? summary.totalIncome : (trend && trend.length > 0 ? trend[trend.length - 1].income : 0);
  const netWorth = summary?.net !== undefined ? summary.net : (estimatedIncome - totalExpense);
  const savingsRate = estimatedIncome > 0 ? (Math.max(0, ((estimatedIncome - totalExpense) / estimatedIncome) * 100)).toFixed(0) : '0';

  const chatMutation = useMutation({
    mutationFn: (data: { message: string; history: any[] }) => api.request('/ai/chat', { method: 'POST', body: data }),
    onSuccess: (data) => setChatHistory(prev => [...prev, { role: 'assistant', content: data.reply }]),
    onError: (err: any) => {
      if (err?.message === 'PRO_REQUIRED' || err?.message?.includes('Monerva Pro')) {
        setShowPaywall(true);
      } else {
        showToast(err.message || 'SYS.ERROR', 'error');
      }
    },
    onSettled: () => setIsSending(false)
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    if (!isPro) {
      setShowPaywall(true);
      return;
    }
    setIsSending(true);
    const newMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: newMsg }]);
    setChatMessage('');
    chatMutation.mutate({ message: newMsg, history: chatHistory });
  };

  const CATEGORY_COLORS = ['#006a61', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7', '#6366f1'];

  return (
    <div className="space-y-8 pb-10 relative min-h-screen text-[#0b1c30] p-6 -m-6 pt-20">
      {/* Background Sky Image to match Landing Page */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <img
          src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png"
          alt=""
          className="w-full h-full object-cover scale-105"
        />
        {/* Soft overlay mask for contrast */}
        <div className="absolute inset-0 bg-white/10 backdrop-brightness-110" />
      </div>


      <div className="relative z-10 space-y-8 p-4 md:p-8">
        <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 pb-6 border-b border-[#e5eeff]">
            <div>
            <div className="text-[10px] uppercase font-bold tracking-widest text-[#0b1c30] bg-white/40 px-2.5 py-1 mb-2 inline-block border border-[#e5eeff] rounded-[6px] backdrop-blur-md">
              SYS.ACTIVE
            </div>
            <h1
              className="text-4xl md:text-5xl font-normal tracking-wide font-serif uppercase leading-none text-[#0b1c30] mb-2"
              style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}
            >
                DASHBOARD
            </h1>
            </div>
            <div className="flex items-center gap-3">
              <SpecularButton
                  size="sm"
                  radius={14}
                  tint="#ffffff"
                  tintOpacity={0.1}
                  blur={8}
                  textColor="#111411"
                  lineColor="#111411"
                  baseColor="#fdf1e1"
                  intensity={1.2}
                  shineSize={12}
                  shineFade={35}
                  thickness={1}
                  speed={0.3}
                  followMouse
                  proximity={200}
                  onClick={() => setScannerOpen(true)}
              >
                  <ScanLine className="w-4 h-4" strokeWidth={2.5} />
                  SCAN
              </SpecularButton>

              <SpecularButton
                  size="sm"
                  radius={14}
                  tint="#ffffff"
                  tintOpacity={0.1}
                  blur={0}
                  textColor="#111411"
                  lineColor="#111411"
                  baseColor="#fdf1e1"
                  intensity={1.2}
                  shineSize={12}
                  shineFade={35}
                  thickness={1}
                  speed={0.3}
                  followMouse
                  proximity={200}
                  onClick={() => menuRef.current?.toggle()}
              >
                 <Plus className="w-4 h-4" strokeWidth={2.5} />
                 ADD
              </SpecularButton>
            </div>
        </div>

        {/* Financial Alerts Banner */}
        <FinancialAlertsBanner />

        {/* Summary Metrics - Bento Grid in Cream Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411]/60 mb-2">
              <TrendingUp className="w-4 h-4 text-[#111411]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Net Worth</span>
            </div>
            <div
              className="text-3xl lg:text-4xl font-normal font-serif text-[#111411]"
              style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}
            >
              {summaryLoading ? <SkeletonChart /> : formatCurrency(netWorth, user?.baseCurrency)}
            </div>
            <div className="text-[10px] text-[#111411]/60 mt-1 font-semibold">Assets minus outflows</div>
          </div>

          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411]/60 mb-2">
              <ArrowDownRight className="w-4 h-4 text-[#111411]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Expenses</span>
            </div>
            <div
              className="text-3xl lg:text-4xl font-normal font-serif text-[#111411]"
              style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}
            >
              {summaryLoading ? <SkeletonChart /> : formatCurrency(totalExpense, user?.baseCurrency)}
            </div>
            <div className="text-[10px] text-[#111411]/60 mt-1 font-semibold">All-time debited volume</div>
          </div>

          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411]/60 mb-2">
              <ArrowUpRight className="w-4 h-4 text-[#111411]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Est. Income</span>
            </div>
            <div
              className="text-3xl lg:text-4xl font-normal font-serif text-[#111411]"
              style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}
            >
              {summaryLoading ? <SkeletonChart /> : formatCurrency(estimatedIncome, user?.baseCurrency)}
            </div>
            <div className="text-[10px] text-[#111411]/60 mt-1 font-semibold">Projected monthly inflow</div>
          </div>

          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411]/60 mb-2">
              <Sparkles className="w-4 h-4 text-[#111411]" strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Savings Rate</span>
            </div>
            <div
              className="text-3xl lg:text-4xl font-normal font-serif text-[#111411]"
              style={{ fontFamily: "'Ogg Medium', Georgia, serif" }}
            >
              {summaryLoading ? <SkeletonChart /> : <>{savingsRate}%</>}
            </div>
            <div className="text-[10px] text-[#111411]/60 mt-1 font-semibold">Of total income saved</div>
          </div>
        </div>

        {/* Charts Row - Cash Flow + Category Pie in Cream Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Flow Trend Area Chart */}
          <div className="lg:col-span-2 bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411] mb-4">
              <TrendingUp className="w-5 h-5 text-[#111411]" strokeWidth={2.5} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Cash Flow Overview</h3>
            </div>
            <div className="h-72">
              {trendLoading ? (
                <SkeletonChart />
              ) : trend && trend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="spentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e7000b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#e7000b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#444' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#444' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #cbd5e1', background: '#fdf1e1', color: '#111411' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" name="Income" dataKey="income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                    <Area type="monotone" name="Spent" dataKey="total" stroke="#e7000b" strokeWidth={2} fillOpacity={1} fill="url(#spentGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">No data available</div>
              )}
            </div>
          </div>

          {/* Category Distribution Pie Chart */}
          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411] mb-4">
              <ShoppingBag className="w-5 h-5 text-[#111411]" strokeWidth={2.5} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Categories</h3>
            </div>
            <div className="h-72 flex items-center justify-center">
              {categoriesData && categoriesData.length > 0 && categoriesData.some((c: any) => c.total > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ bottom: 10 }}>
                    <Pie
                      data={categoriesData.filter((c: any) => c.total > 0)}
                      cx="50%"
                      cy="43%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="total"
                      nameKey="name"
                    >
                      {categoriesData.filter((c: any) => c.total > 0).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #cbd5e1', background: '#fdf1e1', color: '#111411' }} formatter={(value: any) => [formatCurrency(Number(value), user?.baseCurrency), 'Amount']} />
                    <Legend
                      verticalAlign="bottom"
                      height={50}
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{
                        fontSize: '9px',
                        fontWeight: '600',
                        bottom: 0,
                        width: '100%',
                        left: 0,
                        padding: '0 5px',
                        lineHeight: '13px',
                        color: '#111411'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-sm text-[#111411]/55">No expense data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions + AI Coach */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2 bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[#111411]">
                <Receipt className="w-5 h-5 text-[#111411]" strokeWidth={2.5} />
                <h3 className="text-sm font-bold uppercase tracking-wider">Recent Activity</h3>
              </div>
              <button onClick={() => showToast('GOTO TXNS.', 'info')} className="text-[10px] font-bold text-[#111411] hover:underline cursor-pointer">
                View All
              </button>
            </div>
            <div className="space-y-2">
              {expensesLoading ? (
                <SkeletonCard />
              ) : expenses && expenses.length > 0 ? (
                expenses.slice(0, 5).map((exp: any) => (
                  <div key={exp.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#111411]/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#111411]/10 flex items-center justify-center text-[#111411]">
                        <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-[#111411]">{exp.title}</div>
                        <div className="text-[10px] text-gray-500 font-semibold">{exp.category_name} · {new Date(exp.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-sm font-extrabold font-sans text-[#111411]">
                      {formatCurrency(exp.amount, user?.baseCurrency)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">No transactions yet</div>
              )}
            </div>
          </div>

          {/* AI Coach Insights */}
          <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
            <div className="flex items-center gap-2 text-[#111411] mb-4">
              <Bot className="w-5 h-5 text-[#111411]" strokeWidth={2.5} />
              <h3 className="text-sm font-bold uppercase tracking-wider">AI Coach</h3>
            </div>
            <div className="space-y-3">
              {coachData?.insights?.length > 0 ? (
                coachData.insights.slice(0, 3).map((ins: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-[#111411]/5 border border-[#111411]/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3 h-3 text-[#111411]" />
                      <span className="text-[10px] font-bold text-[#111411] uppercase">{ins.title}</span>
                    </div>
                    <p className="text-[11px] text-[#111411]/70 leading-relaxed">{ins.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-8">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-50 text-[#111411]" />
                  <p>No insights yet. Add more transactions for AI analysis.</p>
                </div>
              )}
              <SpecularButton
                size="sm"
                radius={12}
                tint="#ffffff"
                tintOpacity={0.1}
                blur={0}
                textColor="#111411"
                lineColor="#111411"
                baseColor="#fdf1e1"
                intensity={1}
                shineSize={10}
                shineFade={40}
                thickness={1}
                speed={0.35}
                followMouse
                proximity={200}
                autoAnimate={false}
                onClick={() => setChatOpen(true)}
                className="w-full mt-2"
              >
                <Bot className="w-3.5 h-3.5" />
                Open AI Coach
              </SpecularButton>
            </div>
          </div>
        </div>

        {/* Quests / Gamification */}
        <div className="bg-[#fdf1e1] text-[#111411] rounded-2xl p-6 border border-[rgba(253,241,225,0.42)] shadow-xl shadow-black/20">
          <div className="flex items-center gap-2 text-[#111411] mb-4">
            <Swords className="w-5 h-5 text-[#111411]" strokeWidth={2.5} />
            <h3 className="text-sm font-bold uppercase tracking-wider">Daily Quests</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quests.map(q => (
              <div key={q.id} className="p-4 rounded-xl bg-[#111411]/5 border border-[#111411]/10 flex flex-col items-center text-center">
                <div className="text-[10px] font-bold text-[#111411] uppercase tracking-wider mb-1">{q.title}</div>
                <div className="text-xs text-gray-500 font-semibold mb-1">{q.progress}</div>
                <div className="text-[10px] text-[#111411] font-bold mb-2">Reward: {q.reward}</div>
                {q.completed && q.rewardClaimed ? (
                  <span className="px-3 py-1 rounded-lg bg-[#111411]/10 text-[#111411] text-[10px] font-bold">Claimed</span>
                ) : q.completed ? (
                  <SpecularButton
                    size="sm"
                    radius={10}
                    tint="#ffffff"
                    tintOpacity={0.1}
                    blur={0}
                    textColor="#111411"
                    lineColor="#111411"
                    baseColor="#fdf1e1"
                    intensity={1.2}
                    shineSize={10}
                    shineFade={35}
                    thickness={1}
                    speed={0.4}
                    followMouse
                    proximity={150}
                    autoAnimate
                    onClick={() => claimQuestReward(q.id)}
                  >
                    Claim
                  </SpecularButton>
                ) : (
                  <span className="px-3 py-1 rounded-lg bg-gray-200 text-gray-500 text-[10px] font-bold">In Progress</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Viewport-fixed StaggeredMenu triggered externally by the ADD button */}
      <StaggeredMenu
        ref={menuRef}
        isFixed
        position="right"
        showTrigger={false}
        items={[
          {
            label: 'AI Financial Copilot',
            ariaLabel: 'AI Financial Copilot',
            link: isPro ? '/copilot' : '#',
            onClick: (e) => {
              if (!isPro) {
                e.preventDefault();
                setShowPaywall(true);
              }
            }
          },
          {
            label: 'AI Assistant',
            ariaLabel: 'AI Assistant',
            link: isPro ? '/assistant' : '#',
            onClick: (e) => {
              if (!isPro) {
                e.preventDefault();
                setShowPaywall(true);
              }
            }
          },
          {
            label: 'Savings Goals',
            ariaLabel: 'Savings Goals',
            link: '/goals' // Free feature
          },
          {
            label: 'Add Ledger',
            ariaLabel: 'Add a manual transaction',
            link: '/expenses' // Free feature
          },
          {
            label: 'Receipt Scanner',
            ariaLabel: 'Analyze a receipt',
            link: isPro ? '/copilot' : '#',
            onClick: (e) => {
              if (!isPro) {
                e.preventDefault();
                setShowPaywall(true);
              }
            }
          }
        ]}
        colors={['#fdf1e1', '#bda88f']}
        menuButtonColor="#000"
        openMenuButtonColor="#fff"
        accentColor="#111411"
        displaySocials={false}
        displayItemNumbering={false}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        featureName="Monerva Pro AI Features"
      />
    </div>
  );
}
