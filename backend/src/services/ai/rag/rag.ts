import { prisma } from '../../../db/prisma';
import { getTextAIProvider } from '../providers/provider';
import { RAGFilters } from '../types';
import {
  RAG_INTENT_SYSTEM_INSTRUCTION,
  getRAGIntentPrompt,
  CHAT_SYSTEM_INSTRUCTION
} from '../prompts';

/**
 * Executes a conversational query using Intent Detection and Prisma DB filtering (RAG)
 */
export async function executeRAGQuery(
  userId: string, 
  userQuery: string, 
  history: { role: string; content: string }[] = []
): Promise<string> {
  try {
    const provider = getTextAIProvider();
    
    // 1. Detect user intent and extract query filters
    const intentPrompt = getRAGIntentPrompt(userQuery);
    let filters: RAGFilters = {};
    
    try {
      filters = await provider.generateJSON<RAGFilters>(intentPrompt, RAG_INTENT_SYSTEM_INSTRUCTION);
    } catch (err) {
      console.warn('Intent parsing failed, defaulting to basic recent search.', err);
      filters = { dateRange: 'this-month', limit: 50 };
    }

    // 2. Build secure scoped Prisma query based on detected filters
    const whereClause: any = { userId };

    if (filters.category) {
      whereClause.category = {
        name: { contains: filters.category, mode: 'insensitive' }
      };
    }

    if (filters.merchant) {
      whereClause.title = {
        contains: filters.merchant,
        mode: 'insensitive'
      };
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    // Parse date filters
    if (filters.dateRange) {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (filters.dateRange === 'this-month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (filters.dateRange === 'last-month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (filters.dateRange === 'this-year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      } else if (filters.dateRange === 'last-year') {
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      }

      if (start && end) {
        whereClause.date = { gte: start, lte: end };
      }
    }

    // Query databases
    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: { category: true },
      orderBy: { date: 'desc' },
      take: filters.limit || 50
    });

    // 3. Format dynamic context payload
    const recentData = transactions.map(t => ({
      title: t.title,
      amount: Number(t.amount),
      type: t.type,
      category: t.category.name,
      date: t.date.toISOString().split('T')[0],
      paymentMethod: t.paymentMethod
    }));

    // Gather active budgets for reference
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    const budgetContext = budgets.map(b => ({
      category: b.category.name,
      limit: Number(b.amount)
    }));

    // 4. Formulate contextual prompt and query LLM provider
    const conversationHistoryText = history
      .map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
      .join('\n');

    const promptContext = `
User Query: "${userQuery}"

Recent relevant transactions from DB:
${JSON.stringify(recentData, null, 2)}

Active budgets configuration:
${JSON.stringify(budgetContext, null, 2)}

Recent Conversation History:
${conversationHistoryText}
`;

    const reply = await provider.generateText(promptContext, CHAT_SYSTEM_INSTRUCTION);
    return reply;
  } catch (err) {
    console.error('RAG execution failed:', err);
    return 'I encountered an error querying your finance databases. Let me know if you would like me to try again.';
  }
}
