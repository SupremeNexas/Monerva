import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Users, DollarSign, Handshake, Mail, X, Trash2,
  Sparkles, ArrowRight, Banknote, History, AlertCircle, Check
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/UI/Toast';
import useAuthStore from '../store/authStore';
import EmptyState from '../components/UI/EmptyState';
import { trackEvent } from '../services/analytics';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuthStore();

  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Forms & Modals State
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    split_type: 'equal' as 'equal' | 'exact' | 'percentage' | 'shares',
    date: new Date().toISOString().substring(0, 10),
    paid_by_user_id: user?.id || ''
  });

  const [showSettleModal, setShowSettleModal] = useState<{
    payeeId: string;
    payeeName: string;
    maxAmount: number;
  } | null>(null);

  const [settleForm, setSettleForm] = useState({
    amount: '',
    notes: '',
    date: new Date().toISOString().substring(0, 10)
  });

  // Queries
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.getGroups()
  });

  const { data: groupDetails, isLoading: detailsLoading, refetch: refetchDetails } = useQuery({
    queryKey: ['group-details', selectedGroup?.id],
    queryFn: () => api.getGroupDetails(selectedGroup.id),
    enabled: !!selectedGroup?.id
  });

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.getFriends(),
    enabled: !!user
  });
  const friends = friendsData?.friends || [];

  const getFriendInfo = (friendship: any) => {
    if (friendship.fromUserId === user?.id) {
      return friendship.toUser || { name: 'Friend', email: '' };
    }
    return friendship.fromUser || { name: 'Friend', email: '' };
  };

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: (name: string) => api.createGroup({ name }),
    onSuccess: () => {
      showToast('Shared Group created!', 'success');
      trackEvent('group_created', { member_count: 1 });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setNewGroupName('');
      setShowNewGroup(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create group', 'error');
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: (email: string) => api.addGroupMember(selectedGroup.id, { email }),
    onSuccess: () => {
      showToast('Member added successfully!', 'success');
      refetchDetails();
      setNewMemberEmail('');
      setShowAddMember(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to add member', 'error');
    }
  });

  const addExpenseMutation = useMutation({
    mutationFn: (data: any) => api.addGroupExpense(selectedGroup.id, data),
    onSuccess: () => {
      showToast('Expense recorded successfully!', 'success');
      refetchDetails();
      setExpenseForm({
        title: '',
        amount: '',
        split_type: 'equal',
        date: new Date().toISOString().substring(0, 10),
        paid_by_user_id: user?.id || ''
      });
      setShowAddExpense(false);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to log shared expense', 'error');
    }
  });

  const settleMutation = useMutation({
    mutationFn: (payload: any) => api.addGroupSettlement(selectedGroup.id, payload),
    onSuccess: (res: any) => {
      showToast(res.message || 'Settlement logged successfully!', 'success');
      refetchDetails();
      setShowSettleModal(null);
      setSettleForm({ amount: '', notes: '', date: new Date().toISOString().substring(0, 10) });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to log settlement', 'error');
    }
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: (_, id) => {
      showToast('Group deleted successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      if (selectedGroup?.id === id) {
        setSelectedGroup(null);
      }
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete group', 'error');
    }
  });

  // Handlers
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate(newGroupName);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    addMemberMutation.mutate(newMemberEmail);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !groupDetails || !user) return;

    const totalAmount = parseFloat(expenseForm.amount);
    const payerId = expenseForm.paid_by_user_id || user.id;

    addExpenseMutation.mutate({
      title: expenseForm.title,
      amount: totalAmount,
      date: new Date(expenseForm.date).toISOString(),
      paid_by_user_id: payerId,
      split_type: expenseForm.split_type
    });
  };

  const openSettleModal = (payeeId: string, payeeName: string, amount: number) => {
    setShowSettleModal({
      payeeId,
      payeeName,
      maxAmount: amount
    });
    setSettleForm({
      amount: amount.toFixed(2),
      notes: '',
      date: new Date().toISOString().substring(0, 10)
    });
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSettleModal || !settleForm.amount) return;

    const amt = parseFloat(settleForm.amount);
    if (amt > showSettleModal.maxAmount + 0.005) {
      showToast(`Settlement amount cannot exceed outstanding debt of ₹${showSettleModal.maxAmount.toFixed(2)}`, 'error');
      return;
    }

    settleMutation.mutate({
      paid_to_user_id: showSettleModal.payeeId,
      amount: amt,
      notes: settleForm.notes.trim() || undefined,
      date: settleForm.date ? new Date(settleForm.date).toISOString() : new Date().toISOString()
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)] overflow-hidden fade-in-up">
      {/* Sidebar - Groups list */}
      <div className="premium-card w-full md:w-80 flex flex-col justify-between border-black/[0.05] dark:border-white/[0.05] p-4 h-full shrink-0">
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center pb-4 border-b border-black/[0.04] dark:border-white/[0.04] mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Shared Groups
            </h3>
            <button
              onClick={() => setShowNewGroup(!showNewGroup)}
              className="p-1 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-gray-400 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showNewGroup && (
            <form onSubmit={handleCreateGroup} className="p-3 mb-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.04] space-y-3">
              <input
                type="text"
                placeholder="e.g. Goa Trip, Flatmates"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="input-premium py-1.5 px-3 text-xs w-full"
                required
                autoFocus
              />
              <div className="flex gap-2 text-xs">
                <button type="submit" className="flex-1 btn-premium btn-premium-primary py-1 cursor-pointer">Create</button>
                <button type="button" className="flex-1 btn-premium btn-premium-secondary py-1 cursor-pointer" onClick={() => setShowNewGroup(false)}>Cancel</button>
              </div>
            </form>
          )}

          {/* Scrolling group listing */}
          <div className="overflow-y-auto flex-1 space-y-2 pr-1" data-lenis-prevent>
            {groupsLoading ? (
              <div className="text-center text-xs text-gray-400 py-6">Loading groups...</div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 px-4 border border-dashed border-border rounded-xl my-4 mx-2">
                <p className="text-xs text-muted">No shared workspaces.</p>
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="mt-2 text-[11px] text-emerald-500 font-semibold hover:underline cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            ) : (
              groups.map((g: any) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroup(g)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors text-left
                    ${selectedGroup?.id === g.id
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500 font-semibold'
                      : 'border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">{g.name}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{g.member_count} members synced</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete group "${g.name}"?`)) {
                          deleteGroupMutation.mutate(g.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 cursor-pointer transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!selectedGroup ? (
          <div className="premium-card flex flex-col items-center justify-center text-center flex-1 border-black/[0.05] dark:border-white/[0.05] py-20">
            <Users className="w-12 h-12 text-gray-400 mb-3" />
            <h3 className="text-base font-semibold">Select Shared Group</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px]">Establish trip trackers or split bills with members easily.</p>
          </div>
        ) : detailsLoading || !groupDetails ? (
          <div className="premium-card flex items-center justify-center flex-1">
            <span className="text-sm text-gray-400">Fetching group parameters...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden h-full">
            {/* Upper details summary */}
            <div className="premium-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-black/[0.05] dark:border-white/[0.05] shrink-0">
              <div>
                <h2 className="text-xl font-bold">{groupDetails.group.name}</h2>
                <div className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">
                  {groupDetails.members.length} MEMBERS • TOTAL SPENT: ₹{groupDetails.summary?.total_spent.toFixed(2) || '0.00'}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="btn-premium btn-premium-secondary py-1.5 px-4 text-xs cursor-pointer"
                >
                  Add Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseForm({
                      ...expenseForm,
                      paid_by_user_id: user?.id || groupDetails.members[0]?.id || ''
                    });
                    setShowAddExpense(true);
                  }}
                  className="btn-premium btn-premium-primary py-1.5 px-4 text-xs cursor-pointer"
                >
                  Log Expense
                </button>
              </div>
            </div>

            {/* Member add popup */}
            {showAddMember && (() => {
              const groupEmails = new Set(groupDetails.members.map((m: any) => m.email.toLowerCase()));
              const availableFriends = friends
                .map((f: any) => getFriendInfo(f))
                .filter((friend: any) => friend && friend.email && !groupEmails.has(friend.email.toLowerCase()));

              return (
                <div className="premium-card p-4 border-[#e8e2d8] bg-[#fdfaf6] dark:bg-white/[0.02] space-y-3 shrink-0">
                  <form onSubmit={handleAddMember} className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 w-4 h-4 text-gray-400 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="Enter registered email (e.g. friend@example.com)"
                        value={newMemberEmail}
                        onChange={e => setNewMemberEmail(e.target.value)}
                        className="input-premium pl-9 py-2 text-xs w-full"
                        required
                      />
                    </div>
                    <button type="submit" className="btn-premium btn-premium-primary py-2 text-xs cursor-pointer">Invite</button>
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="p-2 rounded-xl text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>

                  {availableFriends.length > 0 && (
                    <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04]">
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">Or quick add friends:</p>
                      <div className="flex flex-wrap gap-2">
                        {availableFriends.map((friend: any) => (
                          <button
                            key={friend.email}
                            type="button"
                            onClick={() => {
                              addMemberMutation.mutate(friend.email);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.05] hover:bg-emerald-500/10 text-xs font-semibold cursor-pointer border border-black/[0.05] dark:border-white/[0.05] transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-500" />
                            {friend.name || friend.email}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Shared Expense form */}
            {showAddExpense && (
              <div className="premium-card p-4 border-black/[0.05] dark:border-white/[0.05] space-y-4 shrink-0">
                <h4 className="text-sm font-semibold">Log Shared Expense</h4>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 uppercase font-semibold">Description</label>
                    <input
                      type="text"
                      value={expenseForm.title}
                      onChange={e => setExpenseForm({...expenseForm, title: e.target.value})}
                      className="input-premium py-1.5 text-xs"
                      placeholder="e.g. Dinner buffet"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 uppercase font-semibold">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                      className="input-premium py-1.5 text-xs"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-400 uppercase font-semibold">Split Type</label>
                    <select
                      value={expenseForm.split_type}
                      onChange={e => setExpenseForm({...expenseForm, split_type: e.target.value as any})}
                      className="input-premium py-1.5 text-xs"
                    >
                      <option value="equal">Equal (All Members)</option>
                      <option value="exact">Exact Amounts</option>
                      <option value="percentage">Percentages</option>
                      <option value="shares">Shares</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={addExpenseMutation.isPending} className="flex-1 btn-premium btn-premium-primary py-2 text-xs cursor-pointer">
                      {addExpenseMutation.isPending ? 'Saving...' : 'Add Expense'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(false)}
                      className="btn-premium btn-premium-secondary py-2 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DEBT SIMPLIFICATION ALGORITHM CARD */}
            {groupDetails.simplified_debts && groupDetails.simplified_debts.length > 0 && (
              <div className="premium-card p-4 border-emerald-500/20 bg-emerald-500/5 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Splitwise Debt Simplification
                  </h3>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 uppercase">
                    Optimized
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupDetails.simplified_debts.map((transfer: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.04] text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{transfer.paidByName}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{transfer.paidToName}</span>
                      </div>
                      <span className="font-bold text-emerald-500">₹{transfer.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Details columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden min-h-0">

              {/* Balances panel */}
              <div className="premium-card flex flex-col justify-between border-black/[0.05] dark:border-white/[0.05] p-4 h-full overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  <h3 className="text-sm font-bold flex items-center gap-2 pb-3 border-b border-black/[0.04] dark:border-white/[0.04] mb-3 shrink-0">
                    <Handshake className="w-4 h-4 text-emerald-500" />
                    Ledger Balances
                  </h3>
                  <div className="overflow-y-auto flex-1 divide-y divide-black/[0.04] dark:divide-white/[0.04] pr-1">
                    {user && Object.keys(groupDetails.balances[user.id] || {}).map(otherId => {
                      const amount = groupDetails.balances[user.id][otherId];
                      if (amount === 0) return null;
                      const otherUser = groupDetails.members.find((m: any) => m.id == otherId);
                      if (!otherUser) return null;
                      const absAmount = Math.abs(amount);

                      return (
                        <div key={otherId} className="flex justify-between items-center py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xs font-semibold">
                              {otherUser.name.charAt(0)}
                            </div>
                            <div className="text-xs">
                              {amount > 0 ? (
                                <span>You owe <strong className="font-semibold">{otherUser.name}</strong></span>
                              ) : (
                                <span><strong className="font-semibold">{otherUser.name}</strong> owes you</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold font-sans ${amount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                              ₹{absAmount.toFixed(2)}
                            </span>
                            {amount > 0 && (
                              <button
                                onClick={() => openSettleModal(otherId, otherUser.name, absAmount)}
                                className="btn-premium btn-premium-secondary py-1 px-2.5 text-[10px] font-semibold cursor-pointer"
                              >
                                Settle Up
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {user && Object.values(groupDetails.balances[user.id] || {}).every(amt => amt === 0) && (
                      <div className="text-center text-xs text-gray-400 py-10">You are completely settled up with this group!</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions log panel */}
              <div className="premium-card flex flex-col justify-between border-black/[0.05] dark:border-white/[0.05] p-4 h-full overflow-hidden">
                <div className="flex flex-col h-full overflow-hidden">
                  <h3 className="text-sm font-bold flex items-center gap-2 pb-3 border-b border-black/[0.04] dark:border-white/[0.04] mb-3 shrink-0">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Group Expenses & History
                  </h3>
                  <div className="overflow-y-auto flex-1 divide-y divide-black/[0.04] dark:divide-white/[0.04] space-y-2 pr-1">
                    {groupDetails.expenses.length === 0 ? (
                      <div className="py-6">
                        <EmptyState
                          iconName="DollarSign"
                          title="No transactions recorded"
                          description="Add shared items above to start splitting expenses with your group members."
                        />
                      </div>
                    ) : (
                      groupDetails.expenses.map((exp: any) => (
                        <div key={exp.id} className="flex justify-between items-center py-2.5">
                          <div>
                            <div className="text-xs font-semibold">{exp.title}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              Paid by {user && exp.paid_by === user.id ? 'You' : exp.paid_by_name} • {new Date(exp.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-xs font-bold font-sans">₹{Number(exp.amount).toFixed(2)}</div>
                        </div>
                      ))
                    )}

                    {/* Settlements list */}
                    {groupDetails.settlements && groupDetails.settlements.length > 0 && (
                      <div className="pt-4 mt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                        <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Settlement Records</h4>
                        {groupDetails.settlements.slice(0, 6).map((s: any) => (
                          <div key={s.id} className="text-[10px] text-gray-400 bg-black/[0.01] dark:bg-white/[0.01] p-2 rounded-lg border border-black/[0.02] dark:border-white/[0.02] flex justify-between items-center">
                            <span>
                              <strong>{user && s.paid_by === user.id ? 'You' : s.paid_by_name}</strong> paid <strong>{user && s.paid_to === user.id ? 'You' : s.paid_to_name}</strong>
                            </span>
                            <span className="font-bold text-emerald-500">₹{Number(s.amount).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Group Settle Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md mx-4 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <h4 className="text-sm font-bold">Settle Debt with {showSettleModal.payeeName}</h4>
              <button onClick={() => setShowSettleModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                <p className="text-gray-500 dark:text-gray-400">
                  Outstanding Debt: <strong className="text-amber-500 font-bold">₹{showSettleModal.maxAmount.toFixed(2)}</strong>
                </p>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={showSettleModal.maxAmount}
                  value={settleForm.amount}
                  onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })}
                  className="input-premium py-1.5 text-xs w-full mt-1"
                  required
                />
                {parseFloat(settleForm.amount || '0') > showSettleModal.maxAmount + 0.005 && (
                  <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Amount cannot exceed group debt of ₹{showSettleModal.maxAmount.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Date</label>
                <input
                  type="date"
                  value={settleForm.date}
                  onChange={e => setSettleForm({ ...settleForm, date: e.target.value })}
                  className="input-premium py-1.5 text-xs w-full mt-1"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. UPI payment, Cash settlement"
                  value={settleForm.notes}
                  onChange={e => setSettleForm({ ...settleForm, notes: e.target.value })}
                  className="input-premium py-1.5 text-xs w-full mt-1"
                />
              </div>

              {/* Remaining balance preview */}
              <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] flex justify-between items-center text-xs">
                <span className="text-gray-400 text-[10px]">Remaining Debt:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  ₹{Math.max(0, showSettleModal.maxAmount - parseFloat(settleForm.amount || '0')).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={
                    settleMutation.isPending ||
                    parseFloat(settleForm.amount || '0') <= 0 ||
                    parseFloat(settleForm.amount || '0') > showSettleModal.maxAmount + 0.005
                  }
                  className="flex-1 btn-premium btn-premium-primary py-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {settleMutation.isPending ? 'Recording...' : 'Record Settlement'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(null)}
                  className="flex-1 btn-premium btn-premium-secondary py-2 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
