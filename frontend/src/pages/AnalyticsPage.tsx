import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Calendar, Sparkles, TrendingDown, TrendingUp, BarChart3, PieChartIcon, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import { formatCurrency } from '../utils/currency';
import useAuthStore from '../store/authStore';
import { SkeletonCard, SkeletonChart } from '../components/UI/Skeleton';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie 
} from 'recharts';

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Queries
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics-summary', month, year],
    queryFn: () => api.getSummary({ month, year })
  });

  const { data: categoryData = [], isLoading: catLoading } = useQuery({
    queryKey: ['analytics-category', month, year],
    queryFn: () => api.getByCategory({ month, year })
  });

  const { data: trendData = [], isLoading: trendLoading } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: () => api.getTrend()
  });

  const { data: budgetData = [], isLoading: budgetLoading } = useQuery({
    queryKey: ['analytics-budget-status', month, year],
    queryFn: () => api.getBudgetStatus({ month, year })
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['all-expenses-export'],
    queryFn: () => api.getExpenses()
  });

  // Export CSV Handler
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      showToast('No transaction data to export.', 'warning');
      return;
    }

    try {
      const headers = ['ID', 'Title', 'Amount', 'Type', 'Category', 'Wallet', 'Payment Method', 'Date', 'Notes'];
      const rows = expenses.map((exp: any) => [
        exp.id,
        `"${exp.title.replace(/"/g, '""')}"`,
        exp.amount,
        exp.type,
        exp.category_name || 'Other',
        exp.wallet?.name || 'Default',
        exp.payment_method || 'UPI',
        new Date(exp.date).toLocaleDateString(),
        `"${(exp.notes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Monerva_${year}_${month}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('CSV report generated and downloaded!', 'success');
    } catch (e) {
      showToast('Failed to export CSV', 'error');
    }
  };

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#06B6D4', '#6B7280'];

  const isLoading = summaryLoading || catLoading || trendLoading || budgetLoading;

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-black/[0.04] dark:border-white/[0.04] gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Intelligence</h1>
          <p className="text-sm text-gray-400 mt-1">Deep dive audit logs, spend percentages, and budget comparisons.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select 
            value={month} 
            onChange={e => setMonth(parseInt(e.target.value))}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer w-32"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select 
            value={year} 
            onChange={e => setYear(parseInt(e.target.value))}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer w-24"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button 
            onClick={handleExportCSV}
            className="btn-premium btn-premium-primary gap-2 cursor-pointer py-2 text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Numerical Analytics summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="premium-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Outflow Total</div>
          <div className="text-3xl font-bold mt-2 font-sans">{formatCurrency(summary?.total || 0, user?.baseCurrency)}</div>
          <span className="text-[10px] text-gray-400 font-medium mt-1 inline-block">Summed debited volume</span>
        </div>

        <div className="premium-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Average Expense Transaction</div>
          <div className="text-3xl font-bold mt-2 font-sans">{formatCurrency(summary?.average || 0, user?.baseCurrency)}</div>
          <span className="text-[10px] text-gray-400 font-medium mt-1 inline-block">Typical payment size</span>
        </div>

        <div className="premium-card">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Highest Recorded Single Outflow</div>
          <div className="text-3xl font-bold mt-2 font-sans">{formatCurrency(summary?.max || 0, user?.baseCurrency)}</div>
          <span className="text-[10px] text-red-500 font-medium mt-1 inline-block">Peak transaction value</span>
        </div>
          </>
        )}
      </div>

      {/* Grid of charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Area Chart */}
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <div className="premium-card flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-emerald-500" />
              Cash Flow Trend
            </h3>
            <span className="text-xs text-gray-400">Comparing total income vs total spending over time</span>
          </div>

          <div className="h-64 mt-6">
            {!isLoading && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-interactive)' 
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Income" dataKey="income" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" name="Spent" dataKey="total" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">Loading cash flow parameters...</div>
            )}
          </div>
        </div>
        )}

        {/* Budget Comparison Bar Chart */}
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <div className="premium-card flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
              Budget limits vs Spent
            </h3>
            <span className="text-xs text-gray-400">Evaluating active categories against caps</span>
          </div>

          <div className="h-64 mt-6">
            {!isLoading && budgetData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category_name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-interactive)' 
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar name="Budget Limit" dataKey="limit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar name="Actual Spent" dataKey="spent" fill="#EC4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">No active category budget caps set.</div>
            )}
          </div>
        </div>
        )}

        {/* Donut breakdown */}
        {isLoading ? (
          <SkeletonChart className="lg:col-span-2" />
        ) : (
          <div className="premium-card flex flex-col justify-between min-h-[350px] lg:col-span-2">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <PieChartIcon className="w-4.5 h-4.5 text-emerald-500" />
              Category Percentages
            </h3>
            <span className="text-xs text-gray-400">Distribution ratio metrics</span>
          </div>

          <div className="h-64 mt-6 flex justify-center items-center">
            {!isLoading && categoryData.length > 0 && categoryData.some((c: any) => c.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.filter((c: any) => c.total > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="category_name"
                  >
                    {categoryData.filter((c: any) => c.total > 0).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Amount']}
                    contentStyle={{ 
                      backgroundColor: 'var(--card)', 
                      borderColor: 'var(--border)', 
                      borderRadius: 'var(--radius-interactive)' 
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-gray-400">No category parameters found for this month.</div>
            )}
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
