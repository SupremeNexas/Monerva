import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/UI/Toast';
import { SUPPORTED_CURRENCIES } from '../utils/currency';
import { ArrowRight, User as UserIcon, Receipt, Sliders, Bot, TrendingUp, Swords } from 'lucide-react';
import Carousel, { CarouselItemType } from '../components/UI/Carousel';
import { trackEvent } from '../services/analytics';

const FEATURE_ITEMS: CarouselItemType[] = [
  {
    title: 'Unified Ledger',
    description: 'Consolidate checking accounts, savings, and credit cards in a secure double-entry balance repository.',
    id: 'ledger',
    icon: <Receipt className="carousel-icon" />
  },
  {
    title: 'Smart Budget Limits',
    description: 'Track custom category limits (groceries, leisure, subscriptions) to identify leakages instantly.',
    id: 'categories',
    icon: <Sliders className="carousel-icon" />
  },
  {
    title: 'AI Coach & Scanning',
    description: 'Analyze monthly spends, extract invoice details automatically from scanned receipts, and receive smart tips.',
    id: 'ai',
    icon: <Bot className="carousel-icon" />
  },
  {
    title: 'Savings Milestones',
    description: 'Automate contributions and track savings trajectories for important milestones (vacations, home deposits).',
    id: 'goals',
    icon: <TrendingUp className="carousel-icon" />
  },
  {
    title: 'Collaborative Groups',
    description: 'Split shared ledger entries with flatmates, travel groups, or colleagues with clear transparency.',
    id: 'groups',
    icon: <Swords className="carousel-icon" />
  }
];

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

export default function ProfileSetupPage() {
  const { user, updateProfile } = useAuthStore();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Prefill states
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
    trackEvent('onboarding_started');

    if (user) {
      // Fetch browser local settings dynamically
      let detectedTimezone = 'UTC';
      try {
        detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch (_) {}

      // Auto-prefill values from Google login object or fallback
      setFormData({
        name: user.name || '',
        displayName: user.displayName || user.name || '',
        avatar: user.avatar || '',
        baseCurrency: user.baseCurrency || 'USD',
        country: user.country || 'US',
        timezone: user.timezone || detectedTimezone,
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
      const next = { ...prev, [name]: value };
      // Keep displayName in sync with name initially if user hasn't touched it
      if (name === 'name' && !prev.displayName) {
        next.displayName = value;
      }

      // Auto-update currency and timezone when country changes
      if (name === 'country' && value) {
        const defaults = COUNTRY_DEFAULTS[value];
        if (defaults) {
          next.baseCurrency = defaults.currency;
          next.timezone = defaults.timezone;
        }
      }

      return next;
    });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Full name is required.', 'error');
      return;
    }
    if (!formData.displayName.trim()) {
      showToast('Preferred display name is required.', 'error');
      return;
    }
    setStep(3);
  };

  const handleSave = async () => {
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
        longTermGoal: formData.longTermGoal.trim() || null,
        onboardingComplete: true
      });

      showToast('Profile completed successfully! Welcome to Monerva.', 'success');
      trackEvent('onboarding_completed', {
        has_country: Boolean(formData.country),
        has_currency: Boolean(formData.baseCurrency),
        has_income_bracket: Boolean(formData.monthlyIncome),
        has_goal: Boolean(formData.preferredGoal),
      });
      navigate('/dashboard');
    } catch (err: any) {
      console.error('[Onboarding Setup] Failed:', err);
      showToast(err.message || 'Failed to complete profile configuration.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#FCFCFD] text-[#131517]">
      {/* Background Blurs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[480px] bg-white border border-[#E5E7EB] rounded-[32px] p-8 sm:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative z-10">

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#111113] text-white flex items-center justify-center text-[10px] font-bold">
              {step}
            </span>
            <span className="text-xs font-semibold text-gray-500">Step {step} of 3</span>
          </div>
          <div className="flex gap-1.5">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step === 3 ? 'bg-emerald-600' : 'bg-gray-200'}`} />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-[#111113] mb-1 font-display">
            {step === 1 ? 'Welcome to Monerva' : step === 2 ? 'Complete your Profile' : 'Configure financial goals'}
          </h1>
          <p className="text-xs font-normal text-gray-500 leading-normal">
            {step === 1
              ? 'Here is an overview of what you can do with Monerva to streamline your analytical finances.'
              : step === 2
              ? 'Tell us a bit about yourself. Monerva uses these details to personalize display labels.'
              : 'Add your currency and budget details to configure active financial charts.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-6 flex flex-col items-center"
            >
              <div className="w-full flex justify-center py-2 relative overflow-hidden" style={{ minHeight: '260px' }}>
                <Carousel
                  items={FEATURE_ITEMS}
                  baseWidth={400}
                  autoplay={true}
                  autoplayDelay={4500}
                  pauseOnHover={true}
                  loop={true}
                  round={false}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-[50px] rounded-2xl bg-[#111113] hover:bg-[#202023] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
              >
                Start Setup <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </motion.div>
          ) : step === 2 ? (
            <motion.form
              key="step-2"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              onSubmit={handleNextStep}
              className="space-y-4"
            >
              {/* Optional Avatar Preview */}
              <div className="flex items-center gap-4 mb-2 p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  {formData.avatar ? (
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avatar Url</label>
                  <input
                    type="url"
                    name="avatar"
                    className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181A]">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/80 transition-all"
                  placeholder="e.g. Supriyo Sen"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#18181A]">
                  Preferred display name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="displayName"
                  className="w-full h-[50px] px-4 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/80 transition-all"
                  placeholder="e.g. Supriyo"
                  value={formData.displayName}
                  onChange={handleChange}
                />
                <p className="text-[10px] text-gray-400">This is how we'll address you on the dashboard.</p>
              </div>

              {/* Email (Read-Only) */}
              {user?.email && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-400">Linked email</label>
                  <input
                    type="text"
                    className="w-full h-[50px] px-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
                    value={user.email}
                    disabled
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="col-span-1 h-[50px] rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer text-center active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="col-span-2 h-[50px] rounded-2xl bg-[#111113] hover:bg-[#202023] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  Configure Workspace <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              {/* Currency & Country Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#18181A]">
                    Base currency
                  </label>
                  <select
                    name="baseCurrency"
                    className="w-full h-[50px] px-3.5 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/80 cursor-pointer"
                    value={formData.baseCurrency}
                    onChange={handleChange}
                  >
                    {SUPPORTED_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Country <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    name="country"
                    className="w-full h-[50px] px-3.5 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/80 cursor-pointer"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="">Choose country...</option>
                    {COUNTRIES.map(ct => (
                      <option key={ct.code} value={ct.code}>{ct.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Income Range */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500">
                  Monthly income bracket <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                </label>
                <select
                  name="monthlyIncome"
                  className="w-full h-[50px] px-3.5 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.monthlyIncome}
                  onChange={handleChange}
                >
                  <option value="">Ignore / keep private</option>
                  {INCOME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Core Financial Goal */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500">
                  Core financial goal <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                </label>
                <select
                  name="preferredGoal"
                  className="w-full h-[50px] px-3.5 rounded-2xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-black/80 cursor-pointer"
                  value={formData.preferredGoal}
                  onChange={handleChange}
                >
                  <option value="">Choose focus...</option>
                  {FINANCIAL_GOALS.map(goal => (
                    <option key={goal.value} value={goal.value}>{goal.label}</option>
                  ))}
                </select>
              </div>

              {/* Short & Long Term text inputs */}
              <div className="space-y-3 pt-1 border-t border-gray-100 mt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Short-term Milestone <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="shortTermGoal"
                    className="w-full h-[46px] px-4 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Save ₹25,000 for holiday next quarter"
                    value={formData.shortTermGoal}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500">
                    Long-term Objective <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="longTermGoal"
                    className="w-full h-[46px] px-4 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Buy a flat or clear student loans"
                    value={formData.longTermGoal}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Actions Grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="col-span-1 h-[50px] rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer text-center active:scale-[0.98]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="col-span-2 h-[50px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(16,185,129,0.2)] active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Finish Setup'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
