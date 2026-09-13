import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CreditCard as CardIcon } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import Modal from '../components/UI/Modal';
import { CreditCard as CreditCardType } from '../types';
import { formatCurrency } from '../utils/currency';
import useAuthStore from '../store/authStore';
import SpecularButton from '../components/UI/SpecularButton';
import { CreditCardForm } from '../components/CreditCards/CreditCardForm';
import EmptyState from '../components/UI/EmptyState';
import { SkeletonCard } from '../components/UI/Skeleton';
import { InteractiveCreditCard } from '../components/UI/InteractiveCreditCard';
import CardSwap, { Card as SwapCard } from '../components/UI/CardSwap';

export default function CreditCardsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Queries
  const { data: cards = [], isLoading } = useQuery<CreditCardType[]>({
    queryKey: ['credit-cards'],
    queryFn: () => api.getCreditCards()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.createCreditCard(data),
    onSuccess: (data: any) => {
      showToast('Credit card tracker registered!', 'success');

      // Store card credentials locally linked to the generated card ID
      if (data?.id && tempCardCredentials) {
        localStorage.setItem(`card_details_${data.id}`, JSON.stringify(tempCardCredentials));
        setTempCardCredentials(null);
      }

      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to add card', 'error');
    }
  });

  const [tempCardCredentials, setTempCardCredentials] = useState<{
    cardNumber: string;
    expiryDate: string;
    cvv: string;
  } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCreditCard(id),
    onSuccess: (data, id) => {
      showToast('Credit card removed from ledger.', 'success');
      localStorage.removeItem(`card_details_${id}`);
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete card', 'error');
    }
  });

  const handleFormSubmit = (data: {
    name: string;
    limit_amount: number;
    due_date: string;
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  }) => {
    // Stage credentials temporarily for post-creation hooks
    setTempCardCredentials({
      cardNumber: data.cardNumber || '',
      expiryDate: data.expiryDate || '',
      cvv: data.cvv || ''
    });

    createMutation.mutate({
      name: data.name,
      limit_amount: data.limit_amount,
      due_date: new Date(data.due_date).toISOString(),
      total_due: 0,
      minimum_due: 0
    });
  };

  const handleDelete = (id: string, cardName: string) => {
    if (window.confirm(`Are you sure you want to remove "${cardName}"? This action deletes corresponding metrics.`)) {
      deleteMutation.mutate(id);
    }
  };

  const cardGradients = [
    { from: 'from-slate-900', to: 'to-indigo-950' },
    { from: 'from-amber-950', to: 'to-neutral-900' },
    { from: 'from-emerald-950', to: 'to-teal-950' },
    { from: 'from-rose-950', to: 'to-red-950' }
  ];

  return (
    <div className="space-y-10 fade-in-up pb-24">
      {/* Page Header */}
      <div className="flex justify-between items-center pb-4 border-b border-black/[0.04]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0b1c30]">Credit Liabilities</h1>
          <p className="text-sm text-gray-500 mt-1">Track limits, credit card balances, and upcoming due cycles.</p>
        </div>
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
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Add Card
        </SpecularButton>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          iconName="CreditCard"
          title="No credit cards added"
          description="Add your credit accounts to monitor usage percentages and payment calendars."
          action={
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0b1c30] text-white hover:opacity-90 text-xs py-2 px-5 font-semibold cursor-pointer rounded-xl"
            >
              Add First Card
            </button>
          }
        />
      ) : (
        <>
          {/* CardSwap Carousel Showcase for Multiple Cards */}
          {cards.length > 0 && (
            <div className="soft-card p-8 rounded-2xl relative overflow-hidden bg-gradient-to-r from-[#f5f0e6] to-[#e8d8c5] text-[#0b1c30] shadow-xl flex flex-col lg:flex-row items-center justify-between min-h-[440px]">
              <div className="w-full lg:max-w-md z-10 space-y-4 text-left">
                <span className="text-xs uppercase tracking-[0.25em] font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                  DYNAMIC VAULT DECK
                </span>
                <h2 className="text-4xl font-extrabold text-[#0b1c30] tracking-tight">
                  Your Active Liabilities
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Hover over the rotating card vault to freeze transitions, or click any layer to cycle your registered lines of credit and inspect due limits.
                </p>
                <div className="flex gap-4 pt-2">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <span className="text-2xl font-bold text-[#0b1c30] block">{cards.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">REGISTERED CARDS</span>
                  </div>
                  <div className="border-l-2 border-indigo-500 pl-3">
                    <span className="text-2xl font-bold text-[#0b1c30] block">
                      {formatCurrency(cards.reduce((acc, curr) => acc + Number(curr.total_due || 0), 0), user?.baseCurrency)}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">TOTAL COMBINED DUE</span>
                  </div>
                </div>
              </div>

              {/* 3D Stacked CardSwap Showcase */}
              <div className="relative w-[340px] h-[320px] sm:w-[480px] sm:h-[350px] mt-8 lg:mt-0 flex items-center justify-center">
                <CardSwap
                  width={340}
                  height={220}
                  cardDistance={45}
                  verticalDistance={45}
                  delay={4500}
                  pauseOnHover={true}
                  skewAmount={4}
                >
                  {cards.slice(0, 4).map((card, index) => {
                    const gradient = cardGradients[index % cardGradients.length];
                    const limit = Number(card.limit_amount || 0);
                    const due = Number(card.total_due || 0);

                    // Retrieve stored details if present
                    const localDetails = localStorage.getItem(`card_details_${card.id}`);
                    const details = localDetails ? JSON.parse(localDetails) : null;
                    const formattedCardNum = details?.cardNumber || `•••• •••• •••• ${card.id.substring(card.id.length - 4)}`;

                    return (
                      <SwapCard key={card.id} className="!p-0 !border-0 !bg-transparent !shadow-none">
                        <InteractiveCreditCard
                          cardName={card.name}
                          cardNumber={formattedCardNum}
                          limitAmount={limit}
                          totalDue={due}
                          dueDate={(card.days_until_due ?? 0).toString()}
                          cardHolder={user?.name || "CARDHOLDER"}
                          gradientFrom={gradient.from}
                          gradientTo={gradient.to}
                        />
                      </SwapCard>
                    );
                  })}
                </CardSwap>
              </div>
            </div>
          )}

          {/* Individual Account Detail Grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#0b1c30]">Account Details & Limits</h2>
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
              {cards.map((card, index) => {
                const limit = Number(card.limit_amount || 0);
                const due = Number(card.total_due || 0);
                const usage = limit > 0 ? (due / limit) * 100 : 0;
                const daysLeft = card.days_until_due ?? 0;
                const gradient = cardGradients[index % cardGradients.length];

                let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                let riskText = 'Low Risk';
                if (usage > 30 && usage <= 60) {
                  riskColor = 'text-yellow-600 bg-yellow-50 border-yellow-200';
                  riskText = 'Medium Risk';
                } else if (usage > 60) {
                  riskColor = 'text-red-600 bg-red-50 border-red-200';
                  riskText = 'High Risk';
                }

                // Retrieve stored details if present
                const localDetails = localStorage.getItem(`card_details_${card.id}`);
                const details = localDetails ? JSON.parse(localDetails) : null;
                const formattedCardNum = details?.cardNumber || `•••• •••• •••• ${card.id.substring(card.id.length - 4)}`;

                return (
                  <div key={card.id} className="soft-card p-5 sm:p-6 flex flex-col md:flex-row gap-6 items-center md:items-start 2xl:items-center min-w-0 overflow-hidden">
                    <div className="flex-shrink-0 w-full md:w-auto flex justify-center">
                      <InteractiveCreditCard
                        cardName={card.name}
                        cardNumber={formattedCardNum}
                        limitAmount={limit}
                        totalDue={due}
                        dueDate={daysLeft.toString()}
                        cardHolder={user?.name || "CARDHOLDER"}
                        gradientFrom={gradient.from}
                        gradientTo={gradient.to}
                      />
                    </div>

                    <div className="flex-1 w-full min-w-0 space-y-4 pt-1">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-[#0b1c30] truncate">{card.name}</h3>
                          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider ${riskColor}`}>
                            {riskText}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(card.id, card.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer transition-colors flex-shrink-0"
                          title="Remove card"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-slate-100 pt-4">
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block truncate">Due Amount</span>
                          <span className="text-sm font-extrabold text-red-600 block truncate">{formatCurrency(due, user?.baseCurrency)}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block truncate">Min Bill</span>
                          <span className="text-sm font-extrabold text-[#0b1c30] block truncate">{formatCurrency(Number(card.minimum_due || 0), user?.baseCurrency)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block truncate">Limit Available</span>
                          <span className="text-sm font-extrabold text-emerald-600 block truncate">{formatCurrency(limit - due, user?.baseCurrency)}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block truncate">Remaining Time</span>
                          <span className={`text-sm font-extrabold block truncate ${daysLeft <= 5 ? 'text-red-500 font-black animate-pulse' : 'text-[#0b1c30]'}`}>
                            {daysLeft} Days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Credit card modal creation form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register Liability Card"
      >
        <CreditCardForm
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>
    </div>
  );
}
