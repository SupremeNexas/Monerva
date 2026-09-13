import { getTextAIProvider } from '../providers/provider';
import { INTENT_SYSTEM_INSTRUCTION, getIntentPrompt } from '../prompts/prompt.service';

export interface FinanceIntent {
  type: 'SUMMARY' | 'COMPARISON' | 'BUDGET' | 'CATEGORY' | 'MERCHANT' | 'SUBSCRIPTION' | 'LARGEST_EXPENSE' | 'SAVINGS' | 'FORECAST' | 'TRANSACTION_SEARCH' | 'DOCUMENT_RAG' | 'HYBRID';
  filters: {
    category?: string;
    merchant?: string;
    timeframe: 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'all';
    limit: number;
    type: 'EXPENSE' | 'INCOME';
    compareTimeframe: 'this-month' | 'last-month' | 'this-year' | 'last-year' | 'none';
  };
}

export class IntentService {
  static async detectIntent(userQuery: string): Promise<FinanceIntent> {
    const provider = getTextAIProvider();
    
    // If the provider is offline/mock or fails, we want a reliable deterministic fallback
    try {
      if (provider.name !== 'Offline Mock Engine') {
        const prompt = getIntentPrompt(userQuery);
        const result = await provider.generateJSON<any>(prompt, INTENT_SYSTEM_INSTRUCTION);
        if (result && result.type) {
          return {
            type: result.type,
            filters: {
              category: result.filters?.category,
              merchant: result.filters?.merchant,
              timeframe: result.filters?.timeframe || 'this-month',
              limit: Number(result.filters?.limit || 50),
              type: result.filters?.type || 'EXPENSE',
              compareTimeframe: result.filters?.compareTimeframe || 'none'
            }
          };
        }
      }
    } catch (e) {
      console.warn('[IntentService] AI intent classification failed. Using local rule-based classifier.', e);
    }

    return this.detectIntentFallback(userQuery);
  }

  private static detectIntentFallback(query: string): FinanceIntent {
    const q = query.toLowerCase();

    const docKeywords = ['document', 'pdf', 'loan agreement', 'policy', 'contract', 'prepayment', 'foreclosure', 'clause', 'insurance', 'mortgage', 'terms', 'fine print', 'coverage', 'tax return', 'w2', '1099', 'form 16', 'agreement', 'uploaded document'];
    const finKeywords = ['spend', 'spending', 'spent', 'emi', 'paying', 'paid', 'balance', 'expense', 'income', 'budget', 'wallet', 'credit card', 'how much'];

    const hasDocQuery = docKeywords.some(k => q.includes(k));
    const hasFinQuery = finKeywords.some(k => q.includes(k));

    if (hasDocQuery && (q.includes('and') || q.includes('also') || hasFinQuery)) {
      if (q.includes('prepayment') || q.includes('foreclosure') || q.includes('agreement') || q.includes('policy') || q.includes('clause') || q.includes('document') || q.includes('pdf')) {
        if (q.includes('emi') || q.includes('spend') || q.includes('balance') || q.includes('paying') || q.includes('paying in emi')) {
          return {
            type: 'HYBRID',
            filters: { timeframe: 'this-month', limit: 50, type: 'EXPENSE', compareTimeframe: 'none' }
          };
        }
      }
    }

    if (hasDocQuery) {
      return {
        type: 'DOCUMENT_RAG',
        filters: { timeframe: 'this-month', limit: 50, type: 'EXPENSE', compareTimeframe: 'none' }
      };
    }

    // Default structure
    const intent: FinanceIntent = {
      type: 'SUMMARY',
      filters: {
        timeframe: 'this-month',
        limit: 50,
        type: 'EXPENSE',
        compareTimeframe: 'none'
      }
    };

    // Timeframe extraction
    if (q.includes('last month') || q.includes('previous month') || q.includes('june') || q.includes('july')) {
      intent.filters.timeframe = 'last-month';
    } else if (q.includes('this year') || q.includes('year to date')) {
      intent.filters.timeframe = 'this-year';
    } else if (q.includes('last year')) {
      intent.filters.timeframe = 'last-year';
    } else if (q.includes('all time') || q.includes('ever') || q.includes('show all')) {
      intent.filters.timeframe = 'all';
    }

    // Comparison detection
    if (q.includes('compare') || q.includes('versus') || q.includes('vs')) {
      intent.type = 'COMPARISON';
      intent.filters.compareTimeframe = 'last-month';
    }

    // Income vs Expense
    if (q.includes('income') || q.includes('earned') || q.includes('salary') || q.includes('received')) {
      intent.filters.type = 'INCOME';
    }

    // Subscriptions
    if (q.includes('subscription') || q.includes('recurring') || q.includes('renew')) {
      intent.type = 'SUBSCRIPTION';
      return intent;
    }

    // Savings
    if (q.includes('save') || q.includes('savings') || q.includes('goals') || q.includes('goal')) {
      intent.type = 'SAVINGS';
      return intent;
    }

    // Budgets
    if (q.includes('budget') || q.includes('budgets') || q.includes('limit') || q.includes('limit')) {
      intent.type = 'BUDGET';
      return intent;
    }

    // Forecast
    if (q.includes('forecast') || q.includes('predict') || q.includes('overspending') || q.includes('project')) {
      intent.type = 'FORECAST';
      return intent;
    }

    // Largest Expense
    if (q.includes('largest') || q.includes('biggest') || q.includes('highest') || q.includes('max') || q.includes('most expensive')) {
      intent.type = 'LARGEST_EXPENSE';
      intent.filters.limit = 1;
      return intent;
    }

    // Category detection (standard set)
    const categories = ['food', 'travel', 'fuel', 'shopping', 'bills', 'health', 'education', 'entertainment', 'salary', 'investment', 'gift', 'other', 'grocery', 'groceries'];
    for (const cat of categories) {
      if (q.includes(cat)) {
        intent.type = 'CATEGORY';
        intent.filters.category = cat === 'groceries' || cat === 'grocery' ? 'Food' : cat.charAt(0).toUpperCase() + cat.slice(1);
        return intent;
      }
    }

    // Merchant detection (popular examples)
    const merchants = ['amazon', 'uber', 'swiggy', 'zomato', 'netflix', 'spotify', 'apple', 'google', 'zara', 'starbucks', 'mcdonald'];
    for (const merch of merchants) {
      if (q.includes(merch)) {
        intent.type = 'MERCHANT';
        intent.filters.merchant = merch.charAt(0).toUpperCase() + merch.slice(1);
        return intent;
      }
    }

    // Search keywords
    if (q.includes('find') || q.includes('search') || q.includes('show') || q.includes('transactions with')) {
      intent.type = 'TRANSACTION_SEARCH';
      // extract whatever is after "with" or "for" as keyword
      const match = query.match(/(?:with|for|containing|about)\s+(\w+)/i);
      if (match) {
        intent.filters.merchant = match[1]; // fallback search string
      }
    }

    return intent;
  }
}
