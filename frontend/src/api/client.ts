const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim().replace(/\/$/, '') : '';

  // Override stale/deprecated backend domain if set in environment variables
  if (envUrl.includes('fintech-expense-tracker-backend.onrender.com') || envUrl.includes('fintech-finova-backend.onrender.com')) {
    return 'https://fintech-monerva-backend.onrender.com/api';
  }

  if (envUrl) {
    if (envUrl.endsWith('/api') || /\/api\/v\d+$/i.test(envUrl)) {
      return envUrl;
    }
    return `${envUrl}/api`;
  }

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    return 'https://fintech-monerva-backend.onrender.com/api';
  }

  return '/api';
};

const API_BASE = getApiBase();

function getToken(): string | null {
  return localStorage.getItem('fintech_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('fintech_token', token);
  } else {
    localStorage.removeItem('fintech_token');
  }
}

async function request(endpoint: string, options: any = {}): Promise<any> {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();
  const workspaceId = localStorage.getItem('fintech_workspace_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is FormData, delete Content-Type to let fetch set it with the boundary
  if (options.body && options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const config: any = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    let message = '';

    if (Array.isArray(error.details) && error.details.length > 0) {
      message = error.details.map((d: any) => d.message || d.msg).filter(Boolean).join('. ');
    }
    if (!message) {
      message = error.error || error.message;
    }
    if (!message) {
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        message = 'Backend server is unreachable. Please make sure the server is running on port 5002.';
      } else {
        message = `Request failed (HTTP ${response.status})`;
      }
    }

    // Only wipe the token + force-logout on 401s from protected endpoints.
    // Credential endpoints (login, register, google) return 401 for wrong password
    // — we must NOT treat that as a session expiry.
    const isCredentialRoute = endpoint === '/auth/login' || endpoint === '/auth/register' || endpoint === '/auth/google';
    if (response.status === 401 && !isCredentialRoute) {
      setToken(null);
      throw new Error('UNAUTHORIZED');
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  // Direct generic request
  request,

  // Auth
  login: (data: any) => request('/auth/login', { method: 'POST', body: data }),
  register: (data: any) => request('/auth/register', { method: 'POST', body: data }),
  googleLogin: (idToken: string, invitedBy?: string | null) => request('/auth/google', { method: 'POST', body: { idToken, invitedBy } }),
  refreshToken: (refreshToken: string) => request('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  getMe: () => request('/auth/me'),
  updateProfile: (data: any) => request('/auth/profile', { method: 'PUT', body: data }),
  updateCurrency: (currency: string) => request('/auth/currency', { method: 'PUT', body: { currency } }),
  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  // Expenses
  getExpenses: (params: Record<string, any> = {}) => {
    const cleanParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = String(val);
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/expenses${query ? `?${query}` : ''}`);
  },
  getExpense: (id: string) => request(`/expenses/${id}`),
  createExpense: (data: any) => request('/expenses', { method: 'POST', body: data }),
  updateExpense: (id: string, data: any) => request(`/expenses/${id}`, { method: 'PUT', body: data }),
  deleteExpense: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // CSV Import & Export
  exportExpenses: async (params: Record<string, any> = {}) => {
    const cleanParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '' && val !== 'ALL' && val !== 'all' && val !== 'any') {
        cleanParams[key] = String(val);
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    const token = getToken();
    const workspaceId = localStorage.getItem('fintech_workspace_id');

    const response = await fetch(`${API_BASE}/expenses/export${query ? `?${query}` : ''}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(workspaceId ? { 'x-workspace-id': workspaceId } : {})
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Failed to export CSV' }));
      throw new Error(err.error || 'Failed to export CSV');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `monerva_transactions_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
  previewCSVImport: (data: { csvText?: string; columnMapping?: Record<string, string>; rows?: string[][] }) =>
    request('/expenses/import/preview', { method: 'POST', body: data }),
  commitCSVImport: (data: { rows: any[]; skipDuplicates?: boolean }) =>
    request('/expenses/import/commit', { method: 'POST', body: data }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data: any) => request('/categories', { method: 'POST', body: data }),
  updateCategory: (id: string, data: any) => request(`/categories/${id}`, { method: 'PUT', body: data }),
  deleteCategory: (id: string) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/budgets${query ? `?${query}` : ''}`);
  },
  createBudget: (data: any) => request('/budgets', { method: 'POST', body: data }),
  deleteBudget: (id: string) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscriptions: () => request('/subscriptions'),
  createSubscription: (data: any) => request('/subscriptions', { method: 'POST', body: data }),
  updateSubscription: (id: string, data: any) => request(`/subscriptions/${id}`, { method: 'PUT', body: data }),
  deleteSubscription: (id: string) => request(`/subscriptions/${id}`, { method: 'DELETE' }),

  // Credit Cards
  getCreditCards: () => request('/credit_cards'),
  createCreditCard: (data: any) => request('/credit_cards', { method: 'POST', body: data }),
  updateCreditCard: (id: string, data: any) => request(`/credit_cards/${id}`, { method: 'PUT', body: data }),
  deleteCreditCard: (id: string) => request(`/credit_cards/${id}`, { method: 'DELETE' }),

  // Bills
  getBills: () => request('/bills'),
  createBill: (data: any) => request('/bills', { method: 'POST', body: data }),
  updateBill: (id: string, data: any) => request(`/bills/${id}`, { method: 'PUT', body: data }),
  deleteBill: (id: string) => request(`/bills/${id}`, { method: 'DELETE' }),

  // Goals
  getGoals: () => request('/goals'),
  createGoal: (data: any) => request('/goals', { method: 'POST', body: data }),
  updateGoal: (id: string, data: any) => request(`/goals/${id}`, { method: 'PUT', body: data }),
  deleteGoal: (id: string) => request(`/goals/${id}`, { method: 'DELETE' }),

  // Analytics
  getSummary: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/analytics/summary${query ? `?${query}` : ''}`);
  },
  getByCategory: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/analytics/by-category${query ? `?${query}` : ''}`);
  },
  getTrend: () => request('/analytics/trend'),
  getBudgetStatus: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/analytics/budget-status${query ? `?${query}` : ''}`);
  },

  // AI Scanner & Services
  scanBill: (formData: FormData) => request('/ai/scan-bill', { method: 'POST', body: formData }),
  aiChat: (message: string) => request('/ai/chat', { method: 'POST', body: { message } }),
  aiCategorize: (merchant: string) => request('/ai/categorize', { method: 'POST', body: { merchant } }),
  aiAnalyze: () => request('/ai/analyze', { method: 'POST' }),
  aiForecast: () => request('/ai/forecast', { method: 'POST' }),
  aiSubscriptions: () => request('/ai/subscriptions', { method: 'POST' }),
  aiInsights: () => request('/ai/insights', { method: 'POST' }),

  // Insights & Financial Alerts
  getInsights: () => request('/insights'),
  getAlerts: () => request('/alerts'),
  getSpendingLimits: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/alerts/spending-limits${query ? `?${query}` : ''}`);
  },
  dismissAlert: (alertId: string) => request('/alerts/dismiss', { method: 'POST', body: { alertId } }),

  // Groups
  getGroups: () => request('/groups'),
  createGroup: (data: any) => request('/groups', { method: 'POST', body: data }),
  getGroupDetails: (id: string) => request(`/groups/${id}`),
  deleteGroup: (id: string) => request(`/groups/${id}`, { method: 'DELETE' }),
  addGroupMember: (id: string, data: any) => request(`/groups/${id}/members`, { method: 'POST', body: data }),
  addGroupExpense: (id: string, data: any) => request(`/groups/${id}/expenses`, { method: 'POST', body: data }),
  addGroupSettlement: (id: string, data: any) => request(`/groups/${id}/settlements`, { method: 'POST', body: data }),
  getGroupSimplifiedDebts: (id: string) => request(`/groups/${id}/simplified-debts`),

  // Recurring Transactions (Income & Expense rules)
  getRecurring: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams(params as any).toString();
    return request(`/recurring${query ? `?${query}` : ''}`);
  },
  createRecurring: (data: any) => request('/recurring', { method: 'POST', body: data }),
  updateRecurring: (id: string, data: any) => request(`/recurring/${id}`, { method: 'PUT', body: data }),
  deleteRecurring: (id: string) => request(`/recurring/${id}`, { method: 'DELETE' }),
  processRecurring: (id: string) => request(`/recurring/${id}/process`, { method: 'POST' }),

  // Transfers
  getTransfers: (params: Record<string, any> = {}) => {
    const cleanParams: Record<string, string> = {};
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '') {
        cleanParams[key] = String(val);
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return request(`/transfers${query ? `?${query}` : ''}`);
  },
  getTransfer: (id: string) => request(`/transfers/${id}`),
  createTransfer: (data: any) => request('/transfers', { method: 'POST', body: data }),
  updateTransfer: (id: string, data: any) => request(`/transfers/${id}`, { method: 'PUT', body: data }),
  deleteTransfer: (id: string) => request(`/transfers/${id}`, { method: 'DELETE' }),

  // Friends
  getFriends: () => request('/friends'),
  getPendingFriends: () => request('/friends/pending'),
  getFriendBalances: () => request('/friends/balances'),
  getFriendSummary: () => request('/friends/summary'),
  sendFriendRequest: (toUserIdOrEmail: string) => {
    if (toUserIdOrEmail.includes('@')) {
      return request('/friends', { method: 'POST', body: { email: toUserIdOrEmail } });
    } else {
      return request('/friends', { method: 'POST', body: { toUserId: toUserIdOrEmail } });
    }
  },
  acceptFriendRequest: (requestId: string) => request(`/friends/${requestId}/accept`, { method: 'PUT' }),
  rejectFriendRequest: (requestId: string) => request(`/friends/${requestId}/reject`, { method: 'PUT' }),
  removeFriend: (friendshipId: string) => request(`/friends/${friendshipId}`, { method: 'DELETE' }),
  addFriendExpense: (friendshipId: string, data: any) => request(`/friends/${friendshipId}/expense`, { method: 'POST', body: data }),
  settleWithFriend: (friendshipId: string, data: number | { amount: number; notes?: string; date?: string; paid_by_user_id?: string }) => {
    const payload = typeof data === 'number' ? { amount: data } : data;
    return request(`/friends/${friendshipId}/settle`, { method: 'POST', body: payload });
  },
  getFriendSettlements: (friendshipId: string) => request(`/friends/${friendshipId}/settlements`),

  // Documents RAG
  uploadDocument: (formData: FormData) => request('/documents', { method: 'POST', body: formData }),
  getDocuments: () => request('/documents'),
  getDocument: (id: string) => request(`/documents/${id}`),
  deleteDocument: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),
  queryDocuments: (query: string) => request('/documents/query', { method: 'POST', body: { query } }),
};
