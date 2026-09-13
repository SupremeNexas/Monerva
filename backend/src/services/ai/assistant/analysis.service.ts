import { FinanceIntent } from './intent.service';
import { QueryResult } from './query.service';

export interface AnalysisSummary {
  totalSpend: number;
  totalIncome: number;
  netSavings: number;
  savingsRate: number;
  averageTransactionAmount: number;
  transactionCount: number;
  
  // Specific views
  categoryBreakdown: { name: string; value: number; count: number; percentage: number }[];
  merchantBreakdown: { name: string; value: number; count: number }[];
  dailyTrends: { name: string; value: number }[];
  
  // Budget status
  budgetsProgress?: { category: string; limit: number; spent: number; remaining: number; overrun: boolean }[];
  
  // Comparisons
  comparison?: {
    mainPeriodSpend: number;
    comparePeriodSpend: number;
    differenceAmount: number;
    differencePercentage: number;
    direction: 'increase' | 'decrease' | 'equal';
  };
  
  // Subscriptions summary
  subscriptionsSummary?: {
    totalActiveSubsCost: number;
    activeCount: number;
    items: any[];
  };

  // Goals summary
  goalsSummary?: {
    totalSavingsGoalBalance: number;
    totalSavingsGoalTarget: number;
    items: any[];
  };
}

export class AnalysisService {
  static analyze(queryResult: QueryResult, intent: FinanceIntent): AnalysisSummary {
    const { transactions, budgets, subscriptions, goals, compareTransactions } = queryResult;
    
    // Core calculations
    let totalSpend = 0;
    let totalIncome = 0;
    
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        totalSpend += t.amount;
      } else {
        totalIncome += t.amount;
      }
    });

    const netSavings = totalIncome - totalSpend;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
    const transactionCount = transactions.length;
    const averageTransactionAmount = transactionCount > 0 
      ? (transactions.reduce((sum, t) => sum + t.amount, 0) / transactionCount) 
      : 0;

    // 1. Category breakdown
    const catMap: Record<string, { val: number; cnt: number }> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      if (!catMap[t.category]) {
        catMap[t.category] = { val: 0, cnt: 0 };
      }
      catMap[t.category].val += t.amount;
      catMap[t.category].cnt += 1;
    });

    const categoryBreakdown = Object.entries(catMap).map(([name, stat]) => ({
      name,
      value: Number(stat.val.toFixed(2)),
      count: stat.cnt,
      percentage: totalSpend > 0 ? Number(((stat.val / totalSpend) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.value - a.value);

    // 2. Merchant breakdown
    const merchMap: Record<string, { val: number; cnt: number }> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const merchant = t.title.replace(/^Receipt:\s*/i, '').trim();
      if (!merchMap[merchant]) {
        merchMap[merchant] = { val: 0, cnt: 0 };
      }
      merchMap[merchant].val += t.amount;
      merchMap[merchant].cnt += 1;
    });

    const merchantBreakdown = Object.entries(merchMap).map(([name, stat]) => ({
      name,
      value: Number(stat.val.toFixed(2)),
      count: stat.cnt
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    // 3. Daily trends (group by date)
    const trendMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      trendMap[t.date] = (trendMap[t.date] || 0) + t.amount;
    });

    const dailyTrends = Object.entries(trendMap).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    })).sort((a, b) => a.name.localeCompare(b.name));

    const summary: AnalysisSummary = {
      totalSpend: Number(totalSpend.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      savingsRate: Number(savingsRate.toFixed(1)),
      averageTransactionAmount: Number(averageTransactionAmount.toFixed(2)),
      transactionCount,
      categoryBreakdown,
      merchantBreakdown,
      dailyTrends
    };

    // 4. Budgets status
    if (budgets && budgets.length > 0) {
      summary.budgetsProgress = budgets.map(b => {
        const spent = categoryBreakdown.find(c => c.name.toLowerCase() === b.category.toLowerCase())?.value || 0;
        const remaining = b.amount - spent;
        return {
          category: b.category,
          limit: b.amount,
          spent: Number(spent.toFixed(2)),
          remaining: Number(remaining.toFixed(2)),
          overrun: remaining < 0
        };
      });
    }

    // 5. Comparisons (e.g. main vs comparison timeframe)
    if (compareTransactions && compareTransactions.length > 0) {
      let mainPeriodSpend = totalSpend;
      let comparePeriodSpend = 0;
      compareTransactions.forEach(t => {
        if (t.type === 'EXPENSE') {
          comparePeriodSpend += t.amount;
        }
      });

      const differenceAmount = mainPeriodSpend - comparePeriodSpend;
      const differencePercentage = comparePeriodSpend > 0 
        ? (differenceAmount / comparePeriodSpend) * 100 
        : 0;

      summary.comparison = {
        mainPeriodSpend: Number(mainPeriodSpend.toFixed(2)),
        comparePeriodSpend: Number(comparePeriodSpend.toFixed(2)),
        differenceAmount: Number(differenceAmount.toFixed(2)),
        differencePercentage: Number(differencePercentage.toFixed(1)),
        direction: differenceAmount > 0 ? 'increase' : differenceAmount < 0 ? 'decrease' : 'equal'
      };
    }

    // 6. Subscriptions
    if (subscriptions && subscriptions.length > 0) {
      const activeCount = subscriptions.filter(s => s.isActive).length;
      const totalActiveSubsCost = subscriptions
        .filter(s => s.isActive)
        .reduce((sum, s) => {
          const cost = s.billingCycle === 'YEARLY' ? s.amount / 12 : s.amount;
          return sum + cost;
        }, 0);

      summary.subscriptionsSummary = {
        totalActiveSubsCost: Number(totalActiveSubsCost.toFixed(2)),
        activeCount,
        items: subscriptions
      };
    }

    // 7. Savings Goals
    if (goals && goals.length > 0) {
      const totalSavingsGoalBalance = goals.reduce((sum, g) => sum + g.currentAmount, 0);
      const totalSavingsGoalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
      summary.goalsSummary = {
        totalSavingsGoalBalance: Number(totalSavingsGoalBalance.toFixed(2)),
        totalSavingsGoalTarget: Number(totalSavingsGoalTarget.toFixed(2)),
        items: goals
      };
    }

    return summary;
  }
}
