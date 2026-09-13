import { prisma } from '../../../db/prisma';
import { getTextAIProvider } from '../providers/provider';
import {
  InsightResult,
  SubscriptionResult,
  ForecastResult,
  RecommendationResult,
  HealthScoreResult
} from '../types';
import {
  INSIGHTS_SYSTEM_INSTRUCTION,
  getInsightsPrompt,
  SUBSCRIPTION_SYSTEM_INSTRUCTION,
  getSubscriptionPrompt,
  FORECAST_SYSTEM_INSTRUCTION,
  getForecastPrompt,
  RECOMMENDATIONS_SYSTEM_INSTRUCTION,
  getRecommendationsPrompt,
  HEALTH_SCORE_SYSTEM_INSTRUCTION,
  getHealthScorePrompt
} from '../prompts/index';

/**
 * AI Spending Insights Generator (Scoped to User & Workspace)
 */
export async function generateSpendingInsights(userId: string, workspaceId?: string): Promise<InsightResult[]> {
  try {
    const provider = getTextAIProvider();
    const where: any = { userId, type: 'EXPENSE' };
    if (workspaceId) where.workspaceId = workspaceId;

    // Fetch last 150 expenses
    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 150
    });

    if (transactions.length === 0) {
      return [
        {
          type: 'TREND',
          title: 'Awaiting transactions logs',
          text: 'Add your transactions to trigger automated financial intelligence insights.'
        }
      ];
    }

    const dataContext = transactions.map(t => ({
      title: t.title,
      amount: Number(t.amount),
      category: t.category.name,
      date: t.date.toISOString().split('T')[0],
      day: t.date.getDay() // 0 = Sunday, 6 = Saturday
    }));

    const prompt = getInsightsPrompt(JSON.stringify(dataContext, null, 2));
    const insights = await provider.generateJSON<InsightResult[]>(prompt, INSIGHTS_SYSTEM_INSTRUCTION);

    return Array.isArray(insights) ? insights : [];
  } catch (err) {
    console.error('Error generating spending insights:', err);
    return [];
  }
}

/**
 * AI Subscription Payment Detector (Scoped to User & Workspace)
 */
export async function detectSubscriptions(userId: string, workspaceId?: string): Promise<SubscriptionResult[]> {
  try {
    const provider = getTextAIProvider();
    const where: any = { userId };
    if (workspaceId) where.workspaceId = workspaceId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 200
    });

    const dataContext = transactions.map(t => ({
      title: t.title,
      amount: Number(t.amount),
      type: t.type,
      category: t.category.name,
      date: t.date.toISOString().split('T')[0]
    }));

    const prompt = getSubscriptionPrompt(JSON.stringify(dataContext, null, 2));
    const subs = await provider.generateJSON<SubscriptionResult[]>(prompt, SUBSCRIPTION_SYSTEM_INSTRUCTION);

    return Array.isArray(subs) ? subs : [];
  } catch (err) {
    console.error('Error detecting subscriptions:', err);
    return [];
  }
}

/**
 * AI Budget Limits Recommendations (Scoped to User & Workspace)
 */
export async function generateBudgetRecommendations(userId: string, workspaceId?: string): Promise<RecommendationResult[]> {
  try {
    const provider = getTextAIProvider();
    const where: any = { userId, type: 'EXPENSE' };
    if (workspaceId) where.workspaceId = workspaceId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true }
    });

    const categorySpends: Record<string, { total: number; count: number }> = {};
    for (const t of transactions) {
      const catName = t.category.name;
      if (!categorySpends[catName]) {
        categorySpends[catName] = { total: 0, count: 0 };
      }
      categorySpends[catName].total += Number(t.amount);
      categorySpends[catName].count++;
    }

    const dataContext = Object.entries(categorySpends).map(([cat, info]) => ({
      category: cat,
      totalSpend: info.total,
      averageSpend: Number((info.total / Math.max(1, info.count)).toFixed(2))
    }));

    const prompt = getRecommendationsPrompt(JSON.stringify(dataContext, null, 2));
    const recs = await provider.generateJSON<RecommendationResult[]>(prompt, RECOMMENDATIONS_SYSTEM_INSTRUCTION);

    return Array.isArray(recs) ? recs : [];
  } catch (err) {
    console.error('Error generating budget recommendations:', err);
    return [];
  }
}

/**
 * AI Month-End Spending Forecast (Scoped to User & Workspace)
 */
export async function generateSpendingForecast(userId: string, workspaceId?: string): Promise<ForecastResult> {
  try {
    const provider = getTextAIProvider();
    const txWhere: any = { userId };
    const bgWhere: any = { userId };
    if (workspaceId) {
      txWhere.workspaceId = workspaceId;
      bgWhere.workspaceId = workspaceId;
    }

    const transactions = await prisma.transaction.findMany({
      where: txWhere,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 100
    });

    const budgets = await prisma.budget.findMany({
      where: bgWhere,
      include: { category: true }
    });

    const transContext = transactions.map(t => ({
      amount: Number(t.amount),
      type: t.type,
      date: t.date.toISOString().split('T')[0]
    }));

    const budgetContext = budgets.map(b => ({
      category: b.category.name,
      limit: Number(b.amount)
    }));

    const prompt = getForecastPrompt(
      JSON.stringify(transContext, null, 2),
      JSON.stringify(budgetContext, null, 2)
    );

    return await provider.generateJSON<ForecastResult>(prompt, FORECAST_SYSTEM_INSTRUCTION);
  } catch (err) {
    console.error('Error generating spending forecast:', err);
    return {
      monthEndEstimate: 0,
      budgetOverrunPrediction: false,
      projectedSavings: 0,
      expectedCashFlow: 0,
      confidence: 0.5,
      reasoning: 'Fallback due to forecasting execution error.'
    };
  }
}

/**
 * AI Financial Health Score Calculator (Blends exact Prisma math and Text LLM suggestions)
 */
export async function calculateFinancialHealthScore(userId: string, workspaceId?: string): Promise<HealthScoreResult> {
  try {
    const provider = getTextAIProvider();
    const txWhere: any = { userId };
    const bgWhere: any = { userId };
    if (workspaceId) {
      txWhere.workspaceId = workspaceId;
      bgWhere.workspaceId = workspaceId;
    }

    const transactions = await prisma.transaction.findMany({
      where: txWhere
    });

    const budgets = await prisma.budget.findMany({
      where: bgWhere,
      include: { category: true }
    });

    // Authoritative math calculations from database records
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const monthlySurplus = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

    let totalBudgets = 0;
    let violatedBudgets = 0;

    const expenseByCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + Number(t.amount);
      });

    budgets.forEach(b => {
      totalBudgets++;
      const spent = expenseByCategory[b.categoryId] || 0;
      if (spent > Number(b.amount)) {
        violatedBudgets++;
      }
    });

    const budgetAdherence = totalBudgets > 0 ? ((totalBudgets - violatedBudgets) / totalBudgets) * 100 : 100;

    const metricsPayload = {
      totalIncome,
      totalExpense,
      monthlySurplus,
      savingsRate: `${savingsRate.toFixed(1)}%`,
      budgetAdherence: `${budgetAdherence.toFixed(1)}%`,
      activeBudgetsCount: totalBudgets,
      violatedBudgetsCount: violatedBudgets
    };

    const prompt = getHealthScorePrompt(JSON.stringify(metricsPayload, null, 2));
    const scoreResult = await provider.generateJSON<HealthScoreResult>(prompt, HEALTH_SCORE_SYSTEM_INSTRUCTION);

    return scoreResult;
  } catch (err) {
    console.error('Error calculating financial health score:', err);
    return {
      score: 70,
      metrics: [
        { name: 'Savings Rate', value: '0%', status: 'WARNING' },
        { name: 'Budget Adherence', value: '100%', status: 'GOOD' }
      ],
      suggestions: [
        { category: 'General', text: 'Error calculating complete health metrics profile. Verify logs.', impact: '₹0' }
      ]
    };
  }
}
