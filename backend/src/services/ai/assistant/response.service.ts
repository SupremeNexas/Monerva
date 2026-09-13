import { getTextAIProvider } from '../providers/provider';
import {
  RESPONSE_SYSTEM_INSTRUCTION,
  getResponsePrompt,
  CHART_SYSTEM_INSTRUCTION,
  getChartPrompt
} from '../prompts/prompt.service';
import { AnalysisSummary } from './analysis.service';
import { FinanceIntent } from './intent.service';
import { InternalInsightResponse, ChartConfig } from '../types';

export interface ChatResponse extends InternalInsightResponse {}

export class ResponseService {
  static async generateResponse(
    userQuery: string,
    intent: FinanceIntent,
    summary: AnalysisSummary,
    rawTransactions: any[],
    userCurrency: string
  ): Promise<InternalInsightResponse> {
    const provider = getTextAIProvider();

    let answer = '';
    let charts: ChartConfig[] = [];

    const statsJson = JSON.stringify(summary, null, 2);
    // Limit supporting records context to fit tokens nicely
    const rawRecordsJson = JSON.stringify(rawTransactions.slice(0, 15), null, 2);

    // 1. Generate text answer (LLM explains pre-calculated database stats)
    try {
      if (provider.name !== 'Offline Mock Engine') {
        const textPrompt = getResponsePrompt(userQuery, statsJson, rawRecordsJson, userCurrency);
        answer = await provider.generateText(textPrompt, RESPONSE_SYSTEM_INSTRUCTION);
      }
    } catch (e) {
      console.warn('[ResponseService] Failed to generate response text via AI. Falling back to mock template.', e);
    }

    if (!answer) {
      answer = this.getFallbackAnswer(intent, summary, userCurrency);
    }

    // 2. Generate chart configs
    try {
      if (provider.name !== 'Offline Mock Engine') {
        const chartPrompt = getChartPrompt(statsJson, userQuery);
        const chartResult = await provider.generateJSON<any[]>(chartPrompt, CHART_SYSTEM_INSTRUCTION);
        if (Array.isArray(chartResult)) {
          charts = chartResult.map(c => ({
            type: c.type || 'bar',
            title: c.title || 'Summary',
            data: Array.isArray(c.data) ? c.data : []
          }));
        }
      }
    } catch (e) {
      console.warn('[ResponseService] Failed to generate charts via AI. Using local chart builder.', e);
    }

    if (charts.length === 0) {
      charts = this.getFallbackCharts(intent, summary);
    }

    // 3. Build recommendations array based on DB calculation
    const recommendations: string[] = [];
    if (summary.budgetsProgress) {
      const overruns = summary.budgetsProgress.filter(b => b.overrun);
      overruns.forEach(b => {
        recommendations.push(`Reduce spending in ${b.category} category (exceeded limit by ${userCurrency} ${Math.abs(b.remaining).toFixed(2)})`);
      });
    }
    if (summary.savingsRate < 20 && summary.totalIncome > 0) {
      recommendations.push(`Target raising savings rate above 20% (currently ${summary.savingsRate}%)`);
    }

    // 4. Construct complete structured internal insight response
    const supportingTransactions = rawTransactions.slice(0, 10);
    const contributingCategories = summary.categoryBreakdown.map(c => ({
      name: c.name,
      value: c.value,
      percentage: c.percentage
    }));

    return {
      answer,
      keyNumbers: {
        totalSpend: summary.totalSpend,
        totalIncome: summary.totalIncome,
        netSavings: summary.netSavings,
        savingsRate: summary.savingsRate,
        averageTransactionAmount: summary.averageTransactionAmount,
        transactionCount: summary.transactionCount
      },
      relevantPeriod: intent.filters.timeframe || 'this-month',
      contributingCategories,
      supportingTransactions,
      recommendations,
      confidence: 1.0, // Derived directly from exact SQL database query results
      limitations: summary.transactionCount === 0
        ? 'No matching transaction records found in database for selected criteria'
        : `Grounded in ${summary.transactionCount} authoritative database records`,
      charts,
      summary
    };
  }

  private static getFallbackAnswer(intent: FinanceIntent, summary: AnalysisSummary, currency: string): string {
    const cur = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency + ' ';

    switch (intent.type) {
      case 'SUMMARY':
        return `During this period, your total **outflow** was **${cur}${summary.totalSpend.toLocaleString()}** and total **inflow** was **${cur}${summary.totalIncome.toLocaleString()}**.
This results in a net savings of **${cur}${summary.netSavings.toLocaleString()}** (a **${summary.savingsRate}%** savings rate).
You logged **${summary.transactionCount}** transactions during this timeframe.`;

      case 'CATEGORY':
        const cat = intent.filters.category || 'Food';
        const catSpend = summary.categoryBreakdown.find(c => c.name.toLowerCase() === cat.toLowerCase())?.value || 0;
        const catPct = summary.categoryBreakdown.find(c => c.name.toLowerCase() === cat.toLowerCase())?.percentage || 0;
        return `You spent **${cur}${catSpend.toLocaleString()}** on **${cat}** during this period, which represents **${catPct}%** of your total monthly outflow.`;

      case 'MERCHANT':
        const merch = intent.filters.merchant || 'Amazon';
        const merchSpend = summary.merchantBreakdown.find(m => m.name.toLowerCase() === merch.toLowerCase())?.value || 0;
        const merchCount = summary.merchantBreakdown.find(m => m.name.toLowerCase() === merch.toLowerCase())?.count || 0;
        return `You logged **${merchCount}** purchases at **${merch}** totaling **${cur}${merchSpend.toLocaleString()}** in this period.`;

      case 'COMPARISON':
        if (summary.comparison) {
          const comp = summary.comparison;
          const percentageText = comp.direction === 'increase' ? `up by **${comp.differencePercentage}%**` : `down by **${Math.abs(comp.differencePercentage)}%**`;
          return `Your spending in the current period (**${cur}${comp.mainPeriodSpend.toLocaleString()}**) is ${percentageText} compared to the previous period (**${cur}${comp.comparePeriodSpend.toLocaleString()}**), representing an absolute difference of **${cur}${Math.abs(comp.differenceAmount).toLocaleString()}**.`;
        }
        return `I compared your spending between periods, but couldn't find enough historical data to generate a complete delta.`;

      case 'LARGEST_EXPENSE':
        const largest = summary.categoryBreakdown[0];
        const biggestTx = summary.merchantBreakdown[0];
        if (biggestTx) {
          return `Your biggest individual expenditure was **${cur}${biggestTx.value.toLocaleString()}** at **${biggestTx.name}**. By category, your highest spending area was **${largest?.name || 'Other'}** at **${cur}${largest?.value.toLocaleString()}**.`;
        }
        return `You do not have any logged expenses in this timeframe.`;

      case 'SUBSCRIPTION':
        if (summary.subscriptionsSummary) {
          const sub = summary.subscriptionsSummary;
          return `I detected **${sub.activeCount}** active subscription(s) costing you **${cur}${sub.totalActiveSubsCost.toLocaleString()}** per month.`;
        }
        return `No active recurring subscriptions were found in your ledger.`;

      case 'SAVINGS':
        if (summary.goalsSummary) {
          const goal = summary.goalsSummary;
          return `Your savings rate is **${summary.savingsRate}%** this month. You have saved **${cur}${goal.totalSavingsGoalBalance.toLocaleString()}** towards your active milestone targets (total target: **${cur}${goal.totalSavingsGoalTarget.toLocaleString()}**).`;
        }
        return `Your current savings rate is **${summary.savingsRate}%**. Try setting up a **Savings Goal** to monitor targets automatically.`;

      case 'FORECAST':
        return `Based on your average spending pattern of **${cur}${summary.averageTransactionAmount.toLocaleString()}** across **${summary.transactionCount}** transactions, you are expected to save approximately **${cur}${summary.netSavings.toLocaleString()}** this month.`;

      case 'BUDGET':
        if (summary.budgetsProgress && summary.budgetsProgress.length > 0) {
          const over = summary.budgetsProgress.filter(b => b.overrun);
          if (over.length > 0) {
            return `You have overrun your budget in **${over.map(o => o.category).join(', ')}**. For example, your ${over[0].category} budget is over by **${cur}${Math.abs(over[0].remaining).toLocaleString()}**.`;
          }
          return `Good news! All your active categories are currently under budget limits.`;
        }
        return `I recommend setting up a **Category Budget** in the Budgets tab to track your spending limits.`;

      default:
        return `I analyzed your transactions context. You spent a total of **${cur}${summary.totalSpend.toLocaleString()}** and earned **${cur}${summary.totalIncome.toLocaleString()}** across **${summary.transactionCount}** records. Let me know if you want a detailed category breakdown!`;
    }
  }

  private static getFallbackCharts(intent: FinanceIntent, summary: AnalysisSummary): ChartConfig[] {
    const charts: ChartConfig[] = [];

    // Category distribution chart
    if ((intent.type === 'SUMMARY' || intent.type === 'CATEGORY' || intent.type === 'LARGEST_EXPENSE') && summary.categoryBreakdown.length > 0) {
      charts.push({
        type: 'pie',
        title: 'Spending by Category',
        data: summary.categoryBreakdown.map(c => ({ name: c.name, value: c.value }))
      });
    }

    // Daily spending trend chart
    if ((intent.type === 'SUMMARY' || intent.type === 'FORECAST' || intent.type === 'TRANSACTION_SEARCH') && summary.dailyTrends.length > 0) {
      charts.push({
        type: 'line',
        title: 'Daily Spending Outflow',
        data: summary.dailyTrends
      });
    }

    // Comparison bar chart
    if (intent.type === 'COMPARISON' && summary.comparison) {
      charts.push({
        type: 'bar',
        title: 'Period Spending Comparison',
        data: [
          { name: 'Comparison Period', value: summary.comparison.comparePeriodSpend },
          { name: 'Main Period', value: summary.comparison.mainPeriodSpend }
        ]
      });
    }

    // Budget limit vs spent chart
    if (intent.type === 'BUDGET' && summary.budgetsProgress && summary.budgetsProgress.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Budget Limits vs Spent',
        data: summary.budgetsProgress.flatMap(b => [
          { name: `${b.category} (Limit)`, value: b.limit },
          { name: `${b.category} (Spent)`, value: b.spent }
        ])
      });
    }

    return charts;
  }
}
