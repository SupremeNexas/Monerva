import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Check, ShieldCheck, X, Bot, Scan, TrendingUp, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './Modal.css';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  title = "Unlock Monerva Pro Intelligence",
  description = "Get unlimited access to AI insights, receipt scanning, spending forecasts, and personal financial coaching.",
  featureName
}: PaywallModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user, updateProfile } = useAuthStore();
  const [upgrading, setUpgrading] = React.useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleSimulatedUpgrade = async () => {
    try {
      setUpgrading(true);
      // Simulate upgrade by updating user profile or state
      if (user) {
        useAuthStore.setState({
          user: { ...user, plan: 'PRO' }
        });
      }
      setTimeout(() => {
        setUpgrading(false);
        onClose();
      }, 600);
    } catch (err) {
      setUpgrading(false);
      onClose();
    }
  };

  const proFeatures = [
    {
      icon: Bot,
      title: "Conversational Financial Assistant",
      desc: "Ask any question about your spending, run custom SQL ledger searches, and analyze trends."
    },
    {
      icon: Scan,
      title: "AI Bill & Receipt OCR Scanner",
      desc: "Upload photos of receipts or bills for automatic line-item, merchant, tax, and date extraction."
    },
    {
      icon: BrainCircuit,
      title: "Smart Merchant Categorization",
      desc: "Habit memory profile that auto-learns preferences and categorizes raw transaction data."
    },
    {
      icon: TrendingUp,
      title: "Predictive Spending & Health Diagnostics",
      desc: "30-day forecasted balance curves, recurring bill detection, and financial wellness scores."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="modal-content relative overflow-hidden bg-slate-900/95 border border-indigo-500/30 text-white rounded-2xl shadow-2xl p-6 sm:p-8"
            style={{ maxWidth: '540px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Header & Close Button */}
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-purple-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Monerva Pro</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Headline */}
            <div className="relative z-10 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                {featureName ? `Unlock ${featureName} with Pro` : title}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {description}
              </p>
            </div>

            {/* Pro Feature Checklist */}
            <div className="space-y-3 mb-6 relative z-10">
              {proFeatures.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/30 transition-all">
                    <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Call to Action Buttons */}
            <div className="space-y-3 relative z-10">
              <button
                onClick={handleSimulatedUpgrade}
                disabled={upgrading}
                className="w-full py-3.5 px-5 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>{upgrading ? "Upgrading Account..." : "Upgrade to Monerva Pro — $9.99/mo"}</span>
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              >
                Maybe Later (Continue with Free Plan)
              </button>
            </div>

            {/* Guarantee footer */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cancel anytime in settings. Powered by Monerva Pro Intelligence.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
