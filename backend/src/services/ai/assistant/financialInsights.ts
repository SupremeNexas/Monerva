import { AIService } from '../ai.service';
import { InternalInsightResponse } from '../types';
import {
  generateSpendingInsights,
  detectSubscriptions,
  generateBudgetRecommendations,
  generateSpendingForecast,
  calculateFinancialHealthScore
} from './coach';

export class FinancialInsightsService {
  /**
   * Process a conversational natural language financial question.
   * Scoped securely to userId and workspaceId.
   * Uses PostgreSQL SQL/Prisma retrieval + exact arithmetic + Text LLM explanation.
   * Ordinary financial questions NEVER consume Gemini Vision.
   */
  static async query(
    userId: string,
    workspaceId: string,
    message: string
  ): Promise<InternalInsightResponse> {
    return AIService.processChat(userId, workspaceId, message);
  }

  /**
   * Aggregates comprehensive dashboard financial analysis feed.
   */
  static async getDashboardFeed(userId: string, workspaceId?: string) {
    const [score, forecast, recommendations, insights, subscriptions] = await Promise.all([
      calculateFinancialHealthScore(userId, workspaceId),
      generateSpendingForecast(userId, workspaceId),
      generateBudgetRecommendations(userId, workspaceId),
      generateSpendingInsights(userId, workspaceId),
      detectSubscriptions(userId, workspaceId)
    ]);

    return {
      score,
      forecast,
      recommendations,
      insights,
      subscriptions
    };
  }
}
export default FinancialInsightsService;
