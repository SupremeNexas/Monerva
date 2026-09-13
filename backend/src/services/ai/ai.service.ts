import { prisma } from '../../db/prisma';
import { IntentService } from './assistant/intent.service';
import { QueryService } from './assistant/query.service';
import { AnalysisService } from './assistant/analysis.service';
import { ResponseService, ChatResponse } from './assistant/response.service';
import { RAGService } from './rag/rag.service';
import { getTextAIProvider } from './providers/provider';

export class AIService {
  static async processChat(
    userId: string,
    workspaceId: string,
    message: string
  ): Promise<ChatResponse> {
    try {
      // 1. Fetch user workspace details (especially default base currency)
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      const userCurrency = user?.baseCurrency || 'USD';

      // 2. Detect query intent & filters
      console.log(`[AIService] Detecting intent for query: "${message}"`);
      const intent = await IntentService.detectIntent(message);
      console.log(`[AIService] Detected intent: ${intent.type} with filters:`, intent.filters);

      // 3. Handle pure Document RAG intent
      if (intent.type === 'DOCUMENT_RAG') {
        console.log(`[AIService] Routing query to Document RAG pipeline...`);
        const ragResult = await RAGService.queryDocuments(userId, workspaceId, message);
        return {
          answer: ragResult.answer,
          sources: ragResult.sources,
          keyNumbers: { totalSpend: 0, totalIncome: 0, netSavings: 0, savingsRate: 0 },
          relevantPeriod: 'Document Search',
          contributingCategories: [],
          supportingTransactions: [],
          recommendations: [],
          confidence: ragResult.sources.length > 0 ? 0.95 : 0.5,
          limitations: ragResult.sources.length === 0 ? "No relevant document matching your question was found." : null,
          charts: [],
          summary: null
        };
      }

      // 4. Handle Hybrid intent (Financial Data + Document RAG)
      if (intent.type === 'HYBRID') {
        console.log(`[AIService] Routing query to HYBRID pipeline (PostgreSQL + Document RAG)...`);
        // Query DB
        const queryResult = await QueryService.executeQuery(userId, workspaceId, intent);
        const summary = AnalysisService.analyze(queryResult, intent);
        const finResponse = await ResponseService.generateResponse(
          message,
          intent,
          summary,
          queryResult.transactions,
          userCurrency
        );

        // Query Document RAG
        const ragResult = await RAGService.queryDocuments(userId, workspaceId, message);

        if (ragResult.sources.length === 0) {
          return {
            ...finResponse,
            sources: []
          };
        }

        // Combine DB answer and RAG document context using LLM
        const provider = getTextAIProvider();
        const combinePrompt = `
User Question: "${message}"

Financial Data from Database:
${finResponse.answer}

Excerpt from Uploaded Documents:
${ragResult.answer}

Combine both sources into a clear, unified response that addresses both the financial data numbers and the document clauses. Include source references for the document part.
`;
        const combinedAnswer = await provider.generateText(combinePrompt);

        return {
          ...finResponse,
          answer: combinedAnswer || `${finResponse.answer}\n\nDocument details: ${ragResult.answer}`,
          sources: ragResult.sources
        };
      }

      // 5. Execute standard financial database query (PostgreSQL)
      console.log(`[AIService] Fetching financial data for user: ${userId}, workspace: ${workspaceId}`);
      const queryResult = await QueryService.executeQuery(userId, workspaceId, intent);

      // 6. Calculate stats and aggregations
      console.log('[AIService] Analyzing records data...');
      const summary = AnalysisService.analyze(queryResult, intent);

      // 7. Generate LLM explanation and chart configurations
      console.log('[AIService] Constructing final grounded answer payload...');
      const response = await ResponseService.generateResponse(
        message,
        intent,
        summary,
        queryResult.transactions,
        userCurrency
      );

      return response;
    } catch (err) {
      console.error('[AIService] Failed to process conversational chat:', err);
      throw new Error('AI Assistant failed to compute answer. Please try again.');
    }
  }
}
export default AIService;
