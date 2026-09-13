export type AITask =
  | 'RECEIPT_VISION'
  | 'FINANCIAL_INSIGHTS'
  | 'CATEGORIZATION'
  | 'INTENT_DETECTION'
  | 'COACH_ADVICE';

export interface VisionAIProvider {
  name: string;
  generateMultimodalJSON<T>(
    buffer: Buffer,
    mimeType: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<T>;
}

export interface TextAIProvider {
  name: string;
  generateText(prompt: string, systemInstruction?: string): Promise<string>;
  generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T>;
}

export interface AIProvider extends TextAIProvider {
  generateMultimodalJSON?<T>(
    buffer: Buffer,
    mimeType: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<T>;
}

export interface CategorizationResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface SubscriptionResult {
  detected: boolean;
  name: string;
  amount: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  nextBillingDate: string;
  confidence: number;
  category: string;
}

export interface ForecastResult {
  monthEndEstimate: number;
  budgetOverrunPrediction: boolean;
  projectedSavings: number;
  expectedCashFlow: number;
  confidence: number; // 0 to 1
  reasoning: string;
}

export interface MetricDetail {
  name: string;
  value: string;
  status: 'GOOD' | 'WARNING' | 'CRITICAL';
}

export interface SuggestionDetail {
  category: string;
  text: string;
  impact: string;
}

export interface HealthScoreResult {
  score: number;
  metrics: MetricDetail[];
  suggestions: SuggestionDetail[];
}

export interface InsightResult {
  type: 'SPIKE' | 'TREND' | 'SAVINGS' | 'ANOMALY';
  title: string;
  text: string;
  category?: string;
  impactValue?: number;
}

export interface ReceiptResult {
  merchant: string;
  amount: number;
  tax: number;
  date: string;
  category: string;
  items: string[];
  confidence: number;
}

export interface RecommendationResult {
  category: string;
  averageSpend: number;
  recommendedLimit: number;
  reasoning: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: { name: string; value: number }[];
}

export interface KeyNumbersSummary {
  totalSpend: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  averageTransactionAmount?: number;
  transactionCount?: number;
}

export interface InternalInsightResponse {
  answer: string;
  keyNumbers: KeyNumbersSummary;
  relevantPeriod: string;
  contributingCategories: { name: string; value: number; percentage: number }[];
  supportingTransactions: any[];
  recommendations: string[];
  confidence: number;
  limitations: string | null;
  charts: ChartConfig[];
  summary: any;
  sources?: { filename: string; originalFilename: string; pageNumber: number | null; chunkId: string; similarity: number }[];
}

// RAG / Query Intent details
export interface RAGFilters {
  category?: string;
  merchant?: string;
  dateRange?: 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all';
  limit?: number;
  type?: 'EXPENSE' | 'INCOME';
}
