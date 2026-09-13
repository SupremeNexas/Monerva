import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, UserPlus, Check, X, Mail, Copy,
  Users, Share2, Plus, Banknote, History, Calendar, FileText, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/UI/Toast';
import { trackEvent } from '../services/analytics';

export default function FriendsPage() {
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCustom, setCopiedCustom] = useState(false);
  const [nonExistentEmail, setNonExistentEmail] = useState<string | null>(null);

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState<string | null>(null);
  const [showSettleModal, setShowSettleModal] = useState<{
    friendshipId: string;
    friendName: string;
    maxAmount: number;
  } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);

  // Forms state
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    split_type: 'equal' as 'equal' | 'exact' | 'percentage' | 'shares',
    date: new Date().toISOString().substring(0, 10)
  });

  const [settleForm, setSettleForm] = useState({
    amount: '',
    notes: '',
    date: new Date().toISOString().substring(0, 10)
  });

  // Fetch friends (accepted friendships)
  const { data: friendsData, isLoading: friendsLoading, refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api.getFriends(),
    enabled: !!user
  });

  // Fetch pending friend requests
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = useQuery({
    queryKey: ['friends-pending'],
    queryFn: () => api.getPendingFriends(),
    enabled: !!user
  });

  // Fetch friend balance summary
  const { data: friendSummary } = useQuery({
    queryKey: ['friend-summary'],
    queryFn: () => api.getFriendSummary(),
    enabled: !!user
  });

  // Fetch detailed friend balances
  const { data: friendBalancesData } = useQuery({
    queryKey: ['friend-balances'],
    queryFn: () => api.getFriendBalances(),
    enabled: !!user
  });

  // Fetch settlements history for active modal
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['friend-settlements', showHistoryModal],
    queryFn: () => showHistoryModal ? api.getFriendSettlements(showHistoryModal) : null,
    enabled: !!showHistoryModal
  });

  const friendBalances = friendBalancesData?.balances || [];

  // Mutation for sending friend request
  const sendRequestMutation = useMutation({
    mutationFn: (email: string) => api.sendFriendRequest(email),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      trackEvent('friend_request_sent', { method: 'email_search' });
      setAddEmail('');
      setNonExistentEmail(null);
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['friends-pending'] });
    },
    onError: (error: any) => {
      if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
        setNonExistentEmail(addEmail);
        showToast("We couldn't find a user with that email. You can invite them instead!", "info");
      } else {
        showToast(error.message || 'Failed to send friend request', 'error');
      }
    }
  });

  // Mutation for accepting friend request
  const acceptFriendMutation = useMutation({
    mutationFn: (requestId: string) => api.acceptFriendRequest(requestId),
    onSuccess: () => {
      showToast('Friend request accepted!', 'success');
      trackEvent('friend_request_accepted');
      refetchFriends();
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends-pending'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to accept friend request', 'error');
    }
  });

  // Mutation for rejecting friend request
  const rejectFriendMutation = useMutation({
    mutationFn: (requestId: string) => api.rejectFriendRequest(requestId),
    onSuccess: () => {
      showToast('Friend request rejected', 'success');
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['friends-pending'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to reject friend request', 'error');
    }
  });

  // Mutation for removing a friend
  const removeFriendMutation = useMutation({
    mutationFn: (friendshipId: string) => api.removeFriend(friendshipId),
    onSuccess: () => {
      showToast('Friend removed', 'success');
      refetchFriends();
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to remove friend', 'error');
    }
  });

  // Mutation for adding shared expense with friend
  const addFriendExpenseMutation = useMutation({
    mutationFn: ({ friendshipId, data }: { friendshipId: string; data: any }) => api.addFriendExpense(friendshipId, data),
    onSuccess: () => {
      showToast('Shared expense added!', 'success');
      trackEvent('shared_expense_created', {
        participant_count: 2,
        split_method: expenseForm.split_type,
      });
      setShowExpenseModal(null);
      setExpenseForm({ title: '', amount: '', split_type: 'equal', date: new Date().toISOString().substring(0, 10) });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-summary'] });
      queryClient.invalidateQueries({ queryKey: ['friend-balances'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to add shared expense', 'error');
    }
  });

  // Mutation for settling up with friend
  const settleFriendMutation = useMutation({
    mutationFn: ({ friendshipId, payload }: { friendshipId: string; payload: any }) => api.settleWithFriend(friendshipId, payload),
    onSuccess: (res: any) => {
      showToast(res.message || 'Settlement recorded!', 'success');
      trackEvent('settlement_recorded', { settlement_type: 'friend' });
      setShowSettleModal(null);
      setSettleForm({ amount: '', notes: '', date: new Date().toISOString().substring(0, 10) });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-summary'] });
      queryClient.invalidateQueries({ queryKey: ['friend-balances'] });
      queryClient.invalidateQueries({ queryKey: ['friend-settlements'] });
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to settle balance', 'error');
    }
  });

  const friends = friendsData?.friends || [];
  const pendingRequests = pendingData?.pendingRequests || [];

  // Filter friends by search query
  const filteredFriends = friends.filter((f: any) => {
    const friendInfo = f.toUserId === user?.id ? f.fromUser : f.toUser;
    const friendName = friendInfo?.name || '';
    const friendEmail = friendInfo?.email || '';
    return friendName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           friendEmail.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get the other user in a friendship
  const getFriendInfo = (friendship: any) => {
    if (friendship.fromUserId === user?.id) {
      return friendship.toUser || { name: 'Friend', email: 'N/A' };
    }
    return friendship.fromUser || { name: 'Friend', email: 'N/A' };
  };

  // Generate invitation link
  const personalInviteLink = `${window.location.origin}/auth?invitedBy=${encodeURIComponent(user?.email || '')}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalInviteLink);
    setCopiedLink(true);
    showToast('Invitation link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCustomLink = (email: string) => {
    const customLink = `${window.location.origin}/auth?invitedBy=${encodeURIComponent(user?.email || '')}&inviteEmail=${encodeURIComponent(email)}`;
    navigator.clipboard.writeText(customLink);
    setCopiedCustom(true);
    showToast(`Invite link copied for ${email}!`, 'success');
    setTimeout(() => setCopiedCustom(false), 2000);
  };

  const handleAddFriendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    sendRequestMutation.mutate(addEmail.trim());
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || !showExpenseModal || !user) return;

    addFriendExpenseMutation.mutate({
      friendshipId: showExpenseModal,
      data: {
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        paid_by_user_id: user.id,
        split_type: expenseForm.split_type,
        date: new Date(expenseForm.date).toISOString()
      }
    });
  };

  const openSettleModal = (friendship: any) => {
    const friend = getFriendInfo(friendship);
    const balance = getFriendBalance(friend.id);
    const owedAmount = Math.abs(balance);

    setShowSettleModal({
      friendshipId: friendship.id,
      friendName: friend.name || 'Friend',
      maxAmount: owedAmount
    });
    setSettleForm({
      amount: owedAmount.toFixed(2),
      notes: '',
      date: new Date().toISOString().substring(0, 10)
    });
  };

  const handleSettleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSettleModal || !settleForm.amount) return;

    const amt = parseFloat(settleForm.amount);
    if (amt > showSettleModal.maxAmount + 0.005) {
      showToast(`Settlement cannot exceed outstanding balance of ₹${showSettleModal.maxAmount.toFixed(2)}`, 'error');
      return;
    }

    settleFriendMutation.mutate({
      friendshipId: showSettleModal.friendshipId,
      payload: {
        amount: amt,
        notes: settleForm.notes.trim() || undefined,
        date: settleForm.date ? new Date(settleForm.date).toISOString() : undefined,
        paid_by_user_id: user?.id
      }
    });
  };

  // Get net balance for a friend
  const getFriendBalance = (friendId: string): number => {
    const balance = friendBalances.find(b => b.friend?.id === friendId);
    return balance?.net_balance || 0;
  };

  if (friendsLoading || pendingLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center bg-[#FAFAFA] dark:bg-[#0C0C0C]">
        <div className="animate-pulse text-sm text-gray-500 font-medium">Fetching friend network...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] overflow-hidden fade-in-up">
      {/* Sidebar Area */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full overflow-y-auto pb-4 pr-1" data-lenis-prevent>

        {/* ADD FRIEND CARD */}
        <div className="premium-card p-4 border-black/[0.05] dark:border-white/[0.05] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <UserPlus className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Add Friend</h3>
          </div>

          <form onSubmit={handleAddFriendSubmit} className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 uppercase font-semibold">User Email Address</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={addEmail}
                  onChange={e => {
                    setAddEmail(e.target.value);
                    if (nonExistentEmail) setNonExistentEmail(null);
                  }}
                  className="input-premium py-2 text-xs flex-1"
                  placeholder="e.g. friend@example.com"
                  required
                />
                <button
                  type="submit"
                  disabled={sendRequestMutation.isPending}
                  className="btn-premium btn-premium-primary text-xs py-2 px-4 cursor-pointer shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          </form>

          {nonExistentEmail && (
            <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/20 text-xs space-y-2">
              <p className="text-gray-500 dark:text-gray-400">
                <strong className="text-orange-500">{nonExistentEmail}</strong> is not registered. Send them a personal invite link to auto-connect!
              </p>
              <button
                onClick={() => handleCopyCustomLink(nonExistentEmail)}
                className="flex items-center justify-center gap-1.5 w-full btn-premium btn-premium-primary text-[10px] py-1.5 px-3 cursor-pointer"
              >
                {copiedCustom ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedCustom ? 'Copied Invite Link!' : 'Copy Private Invite URL'}
              </button>
            </div>
          )}
        </div>

        {/* PERSONAL INVITATION CARD */}
        <div className="premium-card p-4 border-black/[0.05] dark:border-white/[0.05] space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
            <Share2 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Invite Link</h3>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            Share your invite link with peers. When they register using your link, you'll instantly connect as friends!
          </p>

          <div className="flex items-center gap-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2.5 rounded-xl">
            <span className="text-[10px] font-mono text-gray-400 truncate flex-1 leading-none select-all">
              {personalInviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer transition-colors"
              title="Copy link to clipboard"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* BALANCE SUMMARY CARD */}
        {friendSummary && (
          <div className="premium-card p-4 border-black/[0.05] dark:border-white/[0.05] space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <Banknote className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold">Balance Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">You're Owed</p>
                <p className="text-sm font-bold text-emerald-500">
                  ₹{friendSummary.total_owed.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">You Owe</p>
                <p className="text-sm font-bold text-red-500">
                  ₹{friendSummary.total_owing.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#fdfaf6] dark:bg-white/[0.02] border border-[#e8e2d8] dark:border-white/[0.05]">
              <p className="text-[9px] text-gray-400 uppercase font-semibold">Net Balance</p>
              <p className={`text-sm font-bold ${friendSummary.net_balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {friendSummary.net_balance >= 0 ? '+' : ''}₹{friendSummary.net_balance.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* PENDING REQUESTS CARD */}
        <div className="premium-card p-4 border-black/[0.05] dark:border-white/[0.05] flex-1 flex flex-col overflow-hidden min-h-[200px]">
          <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04] mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold">Pending Invites</h3>
            </div>
            {pendingRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500 uppercase tracking-wide">
                {pendingRequests.length} Req
              </span>
            )}
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-black/[0.04] dark:divide-white/[0.04] pr-1">
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full py-6 text-gray-400">
                <Mail className="w-7 h-7 stroke-[1.5] text-gray-300 mb-2" />
                <p className="text-[11px]">No inbound requests</p>
              </div>
            ) : (
              pendingRequests.map((request: any) => (
                <div key={request.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {request.fromUser?.name || 'New Member'}
                    </p>
                    <p className="text-[10px] text-gray-450 truncate">{request.fromUser?.email}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => acceptFriendMutation.mutate(request.id)}
                      disabled={acceptFriendMutation.isPending}
                      className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:text-emerald-700 cursor-pointer transition-colors"
                      title="Accept Request"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => rejectFriendMutation.mutate(request.id)}
                      disabled={rejectFriendMutation.isPending}
                      className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-650 hover:text-red-700 cursor-pointer transition-colors"
                      title="Reject Request"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Main Area - List of friends */}
      <div className="flex-1 premium-card border-black/[0.05] dark:border-white/[0.05] p-4 h-full flex flex-col overflow-hidden">

        {/* Search bar & statistics Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-black/[0.04] dark:border-white/[0.04] mb-4 shrink-0">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Connected Network
            </h2>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wider">
              {friends.length} active connections
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 w-3.5 h-3.5 text-gray-400 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-premium pl-8 py-1.5 text-xs w-full"
            />
          </div>
        </div>

        {/* Scrolling list */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04] pr-1" data-lenis-prevent>
          {friends.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <Users className="w-12 h-12 text-gray-300 stroke-[1.5] mb-3" />
              <h3 className="text-sm font-semibold">Build Your Network</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-[280px]">
                Add friends using the sidebar input or copy your invite link to collaborate.
              </p>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No matching friends found for "{searchQuery}".
            </div>
          ) : (
            filteredFriends.map((friendship: any) => {
              const friend = getFriendInfo(friendship);
              const balance = getFriendBalance(friend.id);
              return (
                <div key={friendship.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-3.5 hover:bg-black/[0.005] dark:hover:bg-white/[0.005] transition-colors rounded-xl px-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm font-bold shrink-0">
                      {friend.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{friend.name || 'Friend'}</p>
                      <p className="text-[10px] text-gray-450 mt-0.5 truncate">{friend.email}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 ${balance > 0 ? 'text-emerald-500' : balance < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {balance > 0
                          ? `Owes you ₹${balance.toFixed(2)}`
                          : balance < 0
                          ? `You owe ₹${Math.abs(balance).toFixed(2)}`
                          : 'Settled up'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowExpenseModal(friendship.id)}
                      className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-black/[0.05] dark:border-white/[0.05] text-gray-600 dark:text-gray-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                      title="Add Shared Expense"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-500" />
                      Expense
                    </button>

                    {balance < 0 && (
                      <button
                        onClick={() => openSettleModal(friendship)}
                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                        title="Settle Up"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Settle Up
                      </button>
                    )}

                    <button
                      onClick={() => setShowHistoryModal(friendship.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                      title="Settlement History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove "${friend.name}" from friends?`)) {
                          removeFriendMutation.mutate(friendship.id);
                        }
                      }}
                      disabled={removeFriendMutation.isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Remove Friend"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Shared Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md mx-4 p-5 space-y-4">
            <h4 className="text-sm font-bold">Add Shared Expense</h4>
            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner, Coffee, Movie"
                  value={expenseForm.title}
                  onChange={e => setExpenseForm({...expenseForm, title: e.target.value})}
                  className="input-premium py-1.5 text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Total Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                  className="input-premium py-1.5 text-xs w-full"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Split Type</label>
                <select
                  value={expenseForm.split_type}
                  onChange={e => setExpenseForm({...expenseForm, split_type: e.target.value as any})}
                  className="input-premium py-1.5 text-xs w-full mt-1"
                >
                  <option value="equal">Equal (50/50)</option>
                  <option value="exact">Exact Amounts</option>
                  <option value="percentage">Percentages (50%/50%)</option>
                  <option value="shares">Shares (1:1)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({...expenseForm, date: e.target.value})}
                  className="input-premium py-1.5 text-xs w-full mt-1"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={addFriendExpenseMutation.isPending}
                  className="flex-1 btn-premium btn-premium-primary py-1.5 text-xs cursor-pointer"
                >
                  {addFriendExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(null)}
                  className="flex-1 btn-premium btn-premium-secondary py-1.5 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Up Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="premium-card w-full max-w-md mx-4 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04]">
              <h4 className="text-sm font-bold">Settle Up with {showSettleModal.friendName}</h4>
              <button onClick={() => setShowSettleModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit} className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs">
                <p className="text-gray-500 dark:text-gray-400">
                  Total Outstanding Debt: <strong className="text-amber-500 font-bold">₹{showSettleModal.maxAmount.toFixed(2)}</strong>
                </p>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-semibold">Settlement Amount (₹)</label>
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
                    Amount cannot exceed outstanding debt of ₹{showSettleModal.maxAmount.toFixed(2)}
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
                  placeholder="e.g. Google Pay transaction ID, cash settlement"
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
                    settleFriendMutation.isPending ||
                    parseFloat(settleForm.amount || '0') <= 0 ||
                    parseFloat(settleForm.amount || '0') > showSettleModal.maxAmount + 0.005
                  }
                  className="flex-1 btn-premium btn-premium-primary py-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {settleFriendMutation.isPending ? 'Recording...' : 'Record Settlement'}
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

      {/* Settlement History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
          <div className="premium-card w-full max-w-lg mx-4 p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-white/[0.04] shrink-0">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                Settlement History
              </h4>
              <button onClick={() => setShowHistoryModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-black/[0.04] dark:divide-white/[0.04] pr-1">
              {historyLoading ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">Loading history...</div>
              ) : !historyData?.settlements || historyData.settlements.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No recorded settlements yet.</div>
              ) : (
                historyData.settlements.map((s: any) => (
                  <div key={s.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {s.paidBy?.name || 'Member'} paid {s.paidTo?.name || 'Member'}
                      </span>
                      <span className="font-bold text-emerald-500">₹{Number(s.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-400">
                      <span>{new Date(s.date).toLocaleDateString()}</span>
                      {s.notes && <span className="italic truncate max-w-[200px]">"{s.notes}"</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
