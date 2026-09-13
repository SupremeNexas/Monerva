import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Tag,
  Wallet as WalletIcon,
  CreditCard,
  Users,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Category, Wallet, TransactionFilters } from '../../types';
import { trackEvent } from '../../services/analytics';

interface TransactionFilterToolbarProps {
  filters: TransactionFilters;
  categories: Category[];
  wallets: Wallet[];
  onFilterChange: (updated: Partial<TransactionFilters>) => void;
  onClearFilters: () => void;
  activeCount: number;
}

export function TransactionFilterToolbar({
  filters,
  categories,
  wallets,
  onFilterChange,
  onClearFilters,
  activeCount,
}: TransactionFilterToolbarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Keep local search input synced if external reset happens
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Debounce search input changes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        if (searchInput.trim()) {
          trackEvent('search_used', { search_length: searchInput.trim().length });
        }
        onFilterChange({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters.search, onFilterChange]);

  const handleSearchClear = () => {
    setSearchInput('');
    onFilterChange({ search: '', page: 1 });
  };

  const handleDatePresetChange = (preset: string) => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    if (preset === 'today') {
      startDate = now.toISOString().substring(0, 10);
      endDate = startDate;
    } else if (preset === 'this_week') {
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - dayOfWeek);
      startDate = firstDay.toISOString().substring(0, 10);
      endDate = now.toISOString().substring(0, 10);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().substring(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = firstDay.toISOString().substring(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);
    } else if (preset === 'this_year') {
      startDate = `${now.getFullYear()}-01-01`;
      endDate = `${now.getFullYear()}-12-31`;
    }

    onFilterChange({
      datePreset: preset,
      startDate: preset === 'custom' ? filters.startDate : startDate,
      endDate: preset === 'custom' ? filters.endDate : endDate,
      page: 1,
    });
  };

  const toggleSortOrder = () => {
    const nextOrder = filters.order === 'asc' ? 'desc' : 'asc';
    onFilterChange({ order: nextOrder });
  };

  return (
    <div className="space-y-3">
      {/* Primary Toolbar Bar */}
      <div className="premium-card p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-black/[0.05] dark:border-white/[0.05]">
        {/* Search Bar with Instant Clear */}
        <div className="relative w-full lg:w-72 flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search merchant, notes, tag, address..."
            className="input-premium pl-9 pr-8 py-2 text-xs w-full"
          />
          {searchInput && (
            <button
              onClick={handleSearchClear}
              className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Category Filter */}
          <select
            value={filters.categoryId}
            onChange={(e) => onFilterChange({ categoryId: e.target.value, page: 1 })}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer min-w-[130px]"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Wallet / Source Filter */}
          <select
            value={filters.walletId}
            onChange={(e) => onFilterChange({ walletId: e.target.value, page: 1 })}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer min-w-[120px]"
          >
            <option value="">All Wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Date Preset Filter */}
          <select
            value={filters.datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer min-w-[120px]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
            <option value="custom">Custom Date Range</option>
          </select>

          {/* Transaction Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
            className="input-premium py-1.5 px-3 text-xs cursor-pointer min-w-[110px]"
          >
            <option value="ALL">All Types</option>
            <option value="EXPENSE">Expense (Debit)</option>
            <option value="INCOME">Income (Credit)</option>
            <option value="TRANSFER">Transfer</option>
            <option value="REFUND">Refund</option>
          </select>

          {/* Sort By Field */}
          <div className="flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-xl border border-black/5 dark:border-white/5">
            <select
              value={filters.sort}
              onChange={(e) => onFilterChange({ sort: e.target.value })}
              className="bg-transparent text-xs font-medium cursor-pointer outline-none px-2 py-0.5"
            >
              <option value="date">Sort: Date</option>
              <option value="amount">Sort: Amount</option>
              <option value="title">Sort: Merchant/Title</option>
              <option value="category">Sort: Category</option>
              <option value="wallet">Sort: Wallet</option>
              <option value="payment_method">Sort: Payment Method</option>
            </select>
            <button
              onClick={toggleSortOrder}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
              title={filters.order === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn-premium py-1.5 px-3 text-xs gap-1.5 cursor-pointer border-black/10 dark:border-white/10 ${
              showAdvanced || activeCount > 0
                ? 'bg-black/5 dark:bg-white/5 font-semibold text-emerald-500'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {/* Clear All Filters Button */}
          {activeCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 py-1.5 px-2.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-xl cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Drawer / Panel */}
      {showAdvanced && (
        <div className="premium-card p-4 space-y-4 border-black/[0.08] dark:border-white/[0.08] bg-black/[0.01] dark:bg-white/[0.01] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-500" /> Advanced Smart Filters
            </h4>
            <button
              onClick={() => setShowAdvanced(false)}
              className="text-xs text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Amount Filter Mode & Values */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                Amount Filtering
              </label>
              <select
                value={filters.amountMode}
                onChange={(e) =>
                  onFilterChange({
                    amountMode: e.target.value as any,
                    exactAmount: e.target.value === 'exact' ? filters.exactAmount : '',
                    minAmount: e.target.value === 'range' || e.target.value === 'min' ? filters.minAmount : '',
                    maxAmount: e.target.value === 'range' || e.target.value === 'max' ? filters.maxAmount : '',
                    page: 1,
                  })
                }
                className="input-premium py-1.5 px-3 text-xs w-full cursor-pointer mb-2"
              >
                <option value="any">Any Amount</option>
                <option value="exact">Exact Amount</option>
                <option value="range">Range (Min – Max)</option>
                <option value="min">Minimum Amount</option>
                <option value="max">Maximum Amount</option>
              </select>

              {filters.amountMode === 'exact' && (
                <input
                  type="number"
                  placeholder="e.g. 150.00"
                  step="0.01"
                  value={filters.exactAmount}
                  onChange={(e) => onFilterChange({ exactAmount: e.target.value, page: 1 })}
                  className="input-premium py-1.5 px-3 text-xs w-full"
                />
              )}

              {(filters.amountMode === 'range' || filters.amountMode === 'min') && (
                <input
                  type="number"
                  placeholder="Min Amount"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => onFilterChange({ minAmount: e.target.value, page: 1 })}
                  className="input-premium py-1.5 px-3 text-xs w-full mb-1.5"
                />
              )}

              {(filters.amountMode === 'range' || filters.amountMode === 'max') && (
                <input
                  type="number"
                  placeholder="Max Amount"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => onFilterChange({ maxAmount: e.target.value, page: 1 })}
                  className="input-premium py-1.5 px-3 text-xs w-full"
                />
              )}
            </div>

            {/* Scope / Shared Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                Transaction Scope
              </label>
              <select
                value={filters.scope}
                onChange={(e) => onFilterChange({ scope: e.target.value, page: 1 })}
                className="input-premium py-1.5 px-3 text-xs w-full cursor-pointer"
              >
                <option value="ALL">All Ledger Records</option>
                <option value="PERSONAL">Personal Workspace Expenses</option>
                <option value="SHARED">Shared Expenses (Friends/Groups)</option>
                <option value="GROUP">Group Expenses</option>
                <option value="FRIEND">Friend Split Expenses</option>
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Separate personal from shared group/friend splits.</p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                Payment Method
              </label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => onFilterChange({ paymentMethod: e.target.value, page: 1 })}
                className="input-premium py-1.5 px-3 text-xs w-full cursor-pointer"
              >
                <option value="">All Payment Methods</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI / Digital Wallet</option>
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={filters.tags}
                onChange={(e) => onFilterChange({ tags: e.target.value, page: 1 })}
                placeholder="e.g. coffee, work, groceries"
                className="input-premium py-1.5 px-3 text-xs w-full"
              />
            </div>
          </div>

          {/* Custom Date Range Pickers (shown when custom date preset or explicitly opening date pickers) */}
          {(filters.datePreset === 'custom' || filters.startDate || filters.endDate) && (
            <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.04] grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onFilterChange({ startDate: e.target.value, datePreset: 'custom', page: 1 })}
                  className="input-premium py-1.5 px-3 text-xs w-full cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 block">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onFilterChange({ endDate: e.target.value, datePreset: 'custom', page: 1 })}
                  className="input-premium py-1.5 px-3 text-xs w-full cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Badges Row */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Active:</span>

          {filters.search && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              Query: "{filters.search}"
              <button
                onClick={() => handleSearchClear()}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.categoryId && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              Category: {categories.find((c) => c.id === filters.categoryId)?.name || 'Selected'}
              <button
                onClick={() => onFilterChange({ categoryId: '', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.walletId && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
              Wallet: {wallets.find((w) => w.id === filters.walletId)?.name || 'Selected'}
              <button
                onClick={() => onFilterChange({ walletId: '', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.datePreset !== 'all' && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1.5">
              Date: {filters.datePreset.replace('_', ' ')}
              <button
                onClick={() => handleDatePresetChange('all')}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.type !== 'ALL' && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
              Type: {filters.type}
              <button
                onClick={() => onFilterChange({ type: 'ALL', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.scope !== 'ALL' && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1.5">
              Scope: {filters.scope}
              <button
                onClick={() => onFilterChange({ scope: 'ALL', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.paymentMethod && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center gap-1.5">
              Method: {filters.paymentMethod}
              <button
                onClick={() => onFilterChange({ paymentMethod: '', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {(filters.exactAmount || filters.minAmount || filters.maxAmount) && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
              Amount:{' '}
              {filters.exactAmount
                ? `₹${filters.exactAmount}`
                : `${filters.minAmount ? `≥ ₹${filters.minAmount}` : ''} ${
                    filters.maxAmount ? `≤ ₹${filters.maxAmount}` : ''
                  }`}
              <button
                onClick={() =>
                  onFilterChange({ exactAmount: '', minAmount: '', maxAmount: '', amountMode: 'any', page: 1 })
                }
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.tags && (
            <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              Tags: #{filters.tags}
              <button
                onClick={() => onFilterChange({ tags: '', page: 1 })}
                className="hover:opacity-75 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionFilterToolbar;
