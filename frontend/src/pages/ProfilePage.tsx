import React, { useState, useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/UI/Toast';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { Save, User as UserIcon, ShieldAlert, Trash2, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COUNTRIES = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'JP', label: 'Japan' },
  { code: 'SG', label: 'Singapore' },
  { code: 'AE', label: 'United Arab Emirates' }
];

// Country -> { currency, timezone } mapping for auto-fill
const COUNTRY_DEFAULTS: Record<string, { currency: string; timezone: string }> = {
  IN: { currency: 'INR', timezone: 'Asia/Kolkata' },
  US: { currency: 'USD', timezone: 'America/New_York' },
  GB: { currency: 'GBP', timezone: 'Europe/London' },
  CA: { currency: 'CAD', timezone: 'America/Toronto' },
  AU: { currency: 'AUD', timezone: 'Australia/Sydney' },
  DE: { currency: 'EUR', timezone: 'Europe/Berlin' },
  JP: { currency: 'JPY', timezone: 'Asia/Tokyo' },
  SG: { currency: 'SGD', timezone: 'Asia/Singapore' },
  AE: { currency: 'AED', timezone: 'Asia/Dubai' },
};

const INCOME_RANGES = [
  { label: 'Under ₹25,000 / $300 monthly', value: 'LOW' },
  { label: '₹25,000 - ₹75,000 / $300 - $1,000 monthly', value: 'MEDIUM' },
  { label: '₹75,000 - ₹200,000 / $1,000 - $2,500 monthly', value: 'HIGH' },
  { label: 'Above ₹200,000 / $2,500+ monthly', value: 'PREMIUM' }
];

const FINANCIAL_GOALS = [
  { label: 'Track monthly expenses & cut leakages', value: 'TRACKING' },
  { label: 'Build structured emergency savings fund', value: 'EMERGENCY_FUND' },
  { label: 'Automate debit/credit-card debt paydown', value: 'DEBT_PAYDOWN' },
  { label: 'Retirement wealth generation & investments', value: 'INVESTING' }
];

export default function ProfilePage() {
  const { user, updateProfile, deleteAccount } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    avatar: '',
    baseCurrency: 'USD',
    country: 'US',
    timezone: 'UTC',
    monthlyIncome: 'MEDIUM',
    preferredGoal: 'TRACKING',
    shortTermGoal: '',
    longTermGoal: ''
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        displayName: user.displayName || user.name || '',
        avatar: user.avatar || '',
        baseCurrency: user.baseCurrency || 'USD',
        country: user.country || 'US',
        timezone: user.timezone || 'UTC',
        monthlyIncome: user.monthlyIncome || 'MEDIUM',
        preferredGoal: user.preferredGoal || 'TRACKING',
        shortTermGoal: user.shortTermGoal || '',
        longTermGoal: user.longTermGoal || ''
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value } as typeof prev;

      // Auto-update currency and timezone when country changes
      if (name === 'country' && value) {
        const defaults = COUNTRY_DEFAULTS[value];
        if (defaults) {
          updated.baseCurrency = defaults.currency;
          updated.timezone = defaults.timezone;
        }
      }

      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    if (!formData.displayName.trim()) {
      showToast('Preferred display name is required.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        avatar: formData.avatar.trim() || null,
        baseCurrency: formData.baseCurrency,
        country: formData.country || null,
        timezone: formData.timezone || null,
        monthlyIncome: formData.monthlyIncome || null,
        preferredGoal: formData.preferredGoal || null,
        shortTermGoal: formData.shortTermGoal.trim() || null,
        longTermGoal: formData.longTermGoal.trim() || null
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err: any) {
      console.error('[Profile Update] Error:', err);
      showToast(err.message || 'Failed to save changes.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      showToast('Please type DELETE to confirm account erasure.', 'error');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      showToast('Account permanently deleted.', 'success');
      navigate('/');
    } catch (err: any) {
      console.error('[Account Delete] Error:', err);
      showToast(err.message || 'Failed to delete account.', 'error');
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-gray-500 font-medium animate-pulse">
        Fetching profile context...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111113] font-display">Personal Profile</h1>
        <p className="text-xs text-gray-500">Configure display settings, currencies, and long term financial objectives.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Side: Avatar Card */}
        <div className="md:col-span-1 bg-white border border-[#E5E7EB] rounded-3xl p-6 flex flex-col items-center text-center shadow-xs">
          <div className="w-24 h-24 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-4 shadow-sm shrink-0">
            {formData.avatar ? (
              <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-gray-300" />
            )}
          </div>

          <h3 className="font-bold text-slate-800 text-base">{formData.displayName || formData.name || 'User Profile'}</h3>
          <p className="text-xs text-gray-400 mt-1">{user.email}</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border border-amber-500/30 text-amber-700">
            <span>{user.plan === 'PRO' || user.email?.toLowerCase() === 'demo@example.com' ? '👑 Finova Pro' : 'Free Plan'}</span>
          </div>

          <div className="w-full mt-6 space-y-3 text-left">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avatar Image URL</label>
              <input
                type="url"
                name="avatar"
                className="w-full h-10 px-3 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-black focus:outline-none"
                placeholder="https://example.com/pic.jpg"
                value={formData.avatar}
                onChange={handleChange}
              />
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-2.5 mt-2">
              <ShieldAlert className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
              <div className="text-[10px] text-indigo-700 leading-normal font-medium">
                Linked via <strong>{user.authProvider === 'google' ? 'Google Sign-In' : 'Email/Password'}</strong>. Passwords or payment credentials are never requested.
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Inputs Column */}
        <div className="md:col-span-2 space-y-6">

          {/* Section 1: Basic Identity Data */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2">Identity Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  className="w-full h-[46px] px-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-black/80 focus:outline-none"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Preferred Display Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="displayName"
                  className="w-full h-[46px] px-4 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-black/80 focus:outline-none"
                  value={formData.displayName}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Regional Preferences */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2">Regional Settings</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Base Currency</label>
                <select
                  name="baseCurrency"
                  className="w-full h-[46px] px-3 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.baseCurrency}
                  onChange={handleChange}
                >
                  {SUPPORTED_CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-semibold text-slate-500">Country</label>
                <select
                  name="country"
                  className="w-full h-[46px] px-3 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.country}
                  onChange={handleChange}
                >
                  <option value="">None Selected</option>
                  {COUNTRIES.map(ct => (
                    <option key={ct.code} value={ct.code}>{ct.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Timezone</label>
                <input
                  type="text"
                  name="timezone"
                  className="w-full h-[46px] px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={formData.timezone}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financial Milestones */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-gray-100 pb-2">Financial Milestones</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500">Income Bracket</label>
                <select
                  name="monthlyIncome"
                  className="w-full h-[46px] px-3 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                >
                  <option value="">Keep Private</option>
                  {INCOME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-505 font-medium text-slate-500">Primary Focus</label>
                <select
                  name="preferredGoal"
                  className="w-full h-[46px] px-3 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.preferredGoal}
                  onChange={handleChange}
                >
                  <option value="">Unset</option>
                  {FINANCIAL_GOALS.map(goal => (
                    <option key={goal.value} value={goal.value}>{goal.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-505 font-medium text-slate-500">Short-Term Milestone</label>
                <input
                  type="text"
                  name="shortTermGoal"
                  className="w-full h-[46px] px-4 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Save ₹25,000 for holiday next quarter"
                  value={formData.shortTermGoal}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-505 font-medium text-slate-500">Long-Term Objective</label>
                <input
                  type="text"
                  name="longTermGoal"
                  className="w-full h-[46px] px-4 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Buy a flat or clear student loans"
                  value={formData.longTermGoal}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
            >
              <Save className="w-4.5 h-4.5" />
              {isLoading ? 'Saving changes...' : 'Save Profile'}
            </button>
          </div>

          {/* Danger Zone: Account Deletion */}
          <div className="bg-red-50/50 border border-red-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4 mt-8">
            <div className="flex items-center gap-2 border-b border-red-100 pb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-900">Danger Zone — Permanent Data Erasure</h2>
            </div>
            <p className="text-xs text-red-700 leading-relaxed font-medium">
              Permanent deletion purges your profile, connected wallets, transaction ledgers, uploaded PDF documents, vector embeddings, budget rules, and historical AI chat context. This action is immediate and cannot be undone.
            </p>
            <div className="flex justify-start pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider transition-all duration-150 flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account & Purge My Data
              </button>
            </div>
          </div>

        </div>

      </form>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-red-100 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirm Account Erasure</h3>
                <p className="text-xs text-gray-500">Action cannot be reversed</p>
              </div>
            </div>

            <div className="text-xs text-gray-600 leading-relaxed space-y-2 bg-red-50/60 p-4 rounded-2xl border border-red-100">
              <p className="font-semibold text-red-900">The following data will be permanently purged:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-red-800">
                <li>Personal transactions, receipts, and wallets</li>
                <li>Financial document vault PDFs and vector embeddings</li>
                <li>Custom budgets, goals, and savings history</li>
                <li>AI assistant memory profiles and prompt context</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                className="w-full h-11 px-4 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none uppercase font-mono"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-xs"
              >
                {isDeleting ? 'Purging Data...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
