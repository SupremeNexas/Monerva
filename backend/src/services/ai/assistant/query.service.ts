import { prisma } from '../../../db/prisma';
import { FinanceIntent } from './intent.service';

export interface QueryResult {
  transactions: any[];
  budgets?: any[];
  subscriptions?: any[];
  goals?: any[];
  compareTransactions?: any[];
}

export class QueryService {
  static async executeQuery(userId: string, workspaceId: string, intent: FinanceIntent): Promise<QueryResult> {
    const { type, filters } = intent;
    const result: QueryResult = { transactions: [] };

    // 1. Build date ranges
    const now = new Date();
    const timeframeRange = this.getDateRange(filters.timeframe, now);
    const compareRange = filters.compareTimeframe !== 'none' 
      ? this.getDateRange(filters.compareTimeframe, now) 
      : null;

    // 2. Fetch data based on intent
    const whereClause: any = { 
      userId,
      workspaceId
    };

    // Apply category filter (if specified)
    if (filters.category) {
      whereClause.category = {
        name: { contains: filters.category, mode: 'insensitive' }
      };
    }

    // Apply merchant/title keyword filter (if specified)
    if (filters.merchant) {
      whereClause.OR = [
        { title: { contains: filters.merchant, mode: 'insensitive' } },
        { notes: { contains: filters.merchant, mode: 'insensitive' } }
      ];
    }

    // Apply transaction type (Income vs Expense)
    if (filters.type) {
      whereClause.type = filters.type;
    }

    // Fetch transactions for the main timeframe
    if (type !== 'SUBSCRIPTION' && type !== 'SAVINGS' && type !== 'BUDGET') {
      const mainWhere = { ...whereClause };
      if (timeframeRange) {
        mainWhere.date = { gte: timeframeRange.start, lte: timeframeRange.end };
      }

      const txs = await prisma.transaction.findMany({
        where: mainWhere,
        include: { category: true, wallet: true },
        orderBy: { date: 'desc' },
        take: filters.limit || 50
      });

      result.transactions = txs.map(t => this.mapTransaction(t));

      // Fetch comparison transactions if required
      if (compareRange) {
        const compWhere = { ...whereClause };
        compWhere.date = { gte: compareRange.start, lte: compareRange.end };
        const compTxs = await prisma.transaction.findMany({
          where: compWhere,
          include: { category: true },
          orderBy: { date: 'desc' }
        });
        result.compareTransactions = compTxs.map(t => this.mapTransaction(t));
      }
    }

    // If intent is BUDGET or FORECAST, also fetch Budgets
    if (type === 'BUDGET' || type === 'FORECAST' || type === 'SUMMARY') {
      const budgets = await prisma.budget.findMany({
        where: { userId, workspaceId },
        include: { category: true }
      });
      result.budgets = budgets.map(b => ({
        id: b.id,
        category: b.category.name,
        amount: Number(b.amount),
        period: b.period
      }));

      // Fetch transactions for budgets too if they weren't fetched
      if (result.transactions.length === 0) {
        const txWhere: any = { userId, workspaceId, type: 'EXPENSE' };
        if (timeframeRange) {
          txWhere.date = { gte: timeframeRange.start, lte: timeframeRange.end };
        }
        const txs = await prisma.transaction.findMany({
          where: txWhere,
          include: { category: true }
        });
        result.transactions = txs.map(t => this.mapTransaction(t));
      }
    }

    // If intent is SUBSCRIPTION, fetch Subscriptions or transactions likely to be subscriptions
    if (type === 'SUBSCRIPTION') {
      const subs = await prisma.subscription.findMany({
        where: { userId, workspaceId },
      });
      result.subscriptions = subs.map(s => ({
        id: s.id,
        name: s.name,
        amount: Number(s.amount),
        billingCycle: s.billingCycle,
        nextBillingDate: s.nextBillingDate.toISOString().split('T')[0],
        isActive: s.isActive
      }));
    }

    // If intent is SAVINGS or SUMMARY, fetch savings goals
    if (type === 'SAVINGS' || type === 'SUMMARY') {
      const goals = await prisma.goal.findMany({
        where: { userId, workspaceId },
        include: { contributions: true }
      });
      result.goals = goals.map(g => ({
        id: g.id,
        name: g.name,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
        targetDate: g.targetDate ? g.targetDate.toISOString().split('T')[0] : null,
        contributions: g.contributions.map(c => ({
          amount: Number(c.amount),
          date: c.date.toISOString().split('T')[0],
          notes: c.notes
        }))
      }));

      // Also get transactions for calculation of savings rate
      const txs = await prisma.transaction.findMany({
        where: { userId, workspaceId, date: timeframeRange ? { gte: timeframeRange.start, lte: timeframeRange.end } : undefined },
        include: { category: true }
      });
      result.transactions = txs.map(t => this.mapTransaction(t));
    }

    return result;
  }

  private static getDateRange(timeframe: string, now: Date): { start: Date; end: Date } | null {
    let start: Date;
    let end: Date = new Date(now);

    switch (timeframe) {
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'this-year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'last-year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      default:
        return null;
    }

    return { start, end };
  }

  private static mapTransaction(t: any) {
    return {
      id: t.id,
      title: t.title,
      amount: Number(t.amount),
      type: t.type,
      category: t.category.name,
      categoryColor: t.category.color,
      categoryIcon: t.category.icon,
      wallet: t.wallet?.name,
      paymentMethod: t.paymentMethod,
      date: t.date.toISOString().split('T')[0],
      notes: t.notes
    };
  }
}
