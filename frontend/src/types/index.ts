export interface User {
  id: string;
  name: string;
  displayName?: string;
  email: string;
  baseCurrency: string;
  avatar?: string;
  authProvider: string;
  country?: string;
  timezone?: string;
  monthlyIncome?: string;
  preferredGoal?: string;
  shortTermGoal?: string;
  longTermGoal?: string;
  onboardingComplete: boolean;
  createdAt: string;
  isPremium?: boolean;
  plan?: 'FREE' | 'PRO';
  settings?: UserSettings;
}

export interface UserSettings {
  theme: string;
  currency: string;
  language: string;
  emailNotifications: boolean;
  budgetAlerts: boolean;
}

export interface Wallet {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CREDIT_CARD' | 'UPI' | 'OTHER';
  balance: number;
  color: string;
  createdAt?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  total_due: number;
  minimum_due: number;
  due_date: string;
  billing_cycle_start?: number;
  billing_cycle_end?: number;
  usage_percentage?: number;
  risk_level?: 'Low' | 'Medium' | 'High';
  days_until_due?: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  type: 'EXPENSE' | 'INCOME';
}

export interface Transaction {
  id: string;
  userId?: string;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'REFUND';
  category_id: string;
  categoryId?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  wallet_id?: string;
  walletId?: string;
  wallet_name?: string;
  sourceWalletName?: string;
  wallet_type?: string;
  to_wallet_id?: string | null;
  toWalletId?: string | null;
  to_wallet_name?: string | null;
  destinationWalletName?: string | null;
  destination_wallet_name?: string | null;
  date: string;
  payment_method?: string;
  paymentMethod?: string;
  tags?: string[];
  notes?: string;
  location?: string;
  attachment_url?: string;
  receipt_url?: string;
  is_recurring?: boolean;
  isRecurring?: boolean;
  isShared?: boolean;
  creator?: string;
}

export interface TransactionFilters {
  search: string;
  categoryId: string;
  walletId: string;
  type: string;
  paymentMethod: string;
  amountMode: 'any' | 'exact' | 'range' | 'min' | 'max';
  exactAmount: string;
  minAmount: string;
  maxAmount: string;
  datePreset: string;
  startDate: string;
  endDate: string;
  tags: string;
  scope: string;
  sort: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface PaginatedTransactionsResponse {
  data: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Budget {
  id: string;
  category_id: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  amount: number;
  period: 'monthly' | 'weekly';
  month: number;
  year: number;
  spent: number;
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  contributions?: GoalContribution[];
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  billing_cycle: 'monthly' | 'yearly';
  renewal_date: string;
  is_active: boolean;
  payment_source?: string;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  category_id: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  wallet_id: string;
  wallet_name?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  startDate: string;
  nextDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  category: string;
  status?: 'pending' | 'paid' | 'overdue';
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface GroupMember {
  id: string;
  name: string;
  email: string;
}

export interface GroupExpenseSplit {
  user_id: string;
  amount_owed: number;
}

export interface GroupExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  paid_by: string;
  paid_by_name: string;
  splits: GroupExpenseSplit[];
}

export interface GroupSettlement {
  id: string;
  amount: number;
  date: string;
  paid_by: string;
  paid_by_name: string;
  paid_to: string;
  paid_to_name: string;
  notes?: string | null;
}

export interface SimplifiedTransfer {
  paidBy: string;
  paidByName?: string;
  paidTo: string;
  paidToName?: string;
  amount: number;
}

export interface FriendSettlement {
  id: string;
  friendshipId: string;
  paidById: string;
  paidToId: string;
  amount: number;
  date: string;
  notes?: string | null;
  paidBy?: { id: string; name: string; email: string; avatar?: string };
  paidTo?: { id: string; name: string; email: string; avatar?: string };
}

export interface GroupDetails {
  group: { id: string; name: string; created_by: string; created_at: string };
  members: GroupMember[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  balances: { [userId: string]: { [userId: string]: number } };
  net_positions?: { [userId: string]: number };
  simplified_debts?: SimplifiedTransfer[];
  summary?: {
    total_spent: number;
    user_net_position: number;
    user_owes: number;
    user_is_owed: number;
  };
}

export interface FriendBalanceInfo {
  you_owe: number;
  owed_to_you: number;
  net: number;
}

export interface FriendWithBalance {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
  acknowledged: boolean;
  netBalance: number;
  createdAt: string;
  updatedAt: string;
  fromUser: User;
  toUser: User;
  balance?: FriendBalanceInfo;
}

export interface FriendSummary {
  total_owed: number;
  total_owing: number;
  net_balance: number;
  friend_count: number;
  balances_count: number;
}

export interface SplitType {
  type: 'equal' | 'exact' | 'percentage' | 'shares';
  value?: { user_id: string; amount?: number; percentage?: number; shares?: number }[];
}

export interface ScannedBillItem {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

export interface ScannedBillDraft {
  merchant: string | null;
  description: string | null;
  date: string | null;
  time: string | null;
  total: string | null;
  subtotal: string | null;
  tax: string | null;
  tip: string | null;
  currency: string | null;
  category: string | null;
  categoryId: string | null;
  items: ScannedBillItem[];
  paymentMethod: string | null;
  location: string | null;
}

export interface ScanBillWarning {
  code: string;
  message: string;
}

export interface DuplicateMatch {
  id: string;
  title: string;
  amount: string;
  date: string;
}

export interface DuplicateWarning {
  possibleDuplicate: boolean;
  matches: DuplicateMatch[];
}

export interface ScanBillResponse {
  success: boolean;
  draft: ScannedBillDraft;
  warnings: ScanBillWarning[];
  uncertainFields: string[];
  duplicateWarning: DuplicateWarning | null;
  error?: string;
}

export interface CSVRowPreview {
  rowIndex: number;
  status: 'valid' | 'duplicate' | 'invalid';
  errors: string[];
  warnings: string[];
  data: {
    date: string;
    parsedDate: string | null;
    title: string;
    amount: number | null;
    type: 'EXPENSE' | 'INCOME';
    categoryName: string;
    walletName: string;
    paymentMethod: string;
    tags: string[];
    notes: string;
    location: string;
  };
  duplicateDetails?: string | null;
}

export interface CSVPreviewResponse {
  totalRows: number;
  validRowsCount: number;
  duplicateRowsCount: number;
  invalidRowsCount: number;
  detectedHeaders: string[];
  columnMapping: Record<string, string>;
  categories: { id: string; name: string }[];
  wallets: { id: string; name: string }[];
  rows: CSVRowPreview[];
}

export interface CSVImportResult {
  success: boolean;
  summary: {
    total: number;
    imported: number;
    skipped: number;
    duplicates: number;
    invalid: number;
  };
}

export interface RAGSourceCitation {
  filename: string;
  originalFilename: string;
  pageNumber: number | null;
  chunkId: string;
  similarity: number;
}

export interface DocumentItem {
  id: string;
  userId: string;
  workspaceId?: string | null;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  status: 'PROCESSING' | 'INDEXED' | 'FAILED';
  errorMessage?: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RAGAnswerResult {
  answer: string;
  sources: RAGSourceCitation[];
  chunksFound: number;
}

