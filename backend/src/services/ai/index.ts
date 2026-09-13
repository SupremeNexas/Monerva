export * from './types';
export {
  getAIProvider,
  getVisionAIProvider,
  getTextAIProvider,
  getAIProviderForTask,
  GeminiProvider,
  GeminiVisionProvider,
  GeminiTextProvider,
  MockTextProvider
} from './providers/provider';
export { executeRAGQuery } from './rag/rag';
export { getUserMemoryProfile } from './memory';
export {
  generateSpendingInsights,
  detectSubscriptions,
  generateBudgetRecommendations,
  generateSpendingForecast,
  calculateFinancialHealthScore
} from './assistant/coach';

export { AIService } from './ai.service';
export { FinancialInsightsService } from './assistant/financialInsights';
export { IntentService } from './assistant/intent.service';
export { QueryService } from './assistant/query.service';
export { AnalysisService } from './assistant/analysis.service';
export { ResponseService } from './assistant/response.service';
export { BillScannerService } from './scanner/billScanner';
export { DocumentService } from './documents/document.service';
export { RAGService } from './rag/rag.service';
export { getEmbeddingProvider, cosineSimilarity } from './embeddings/embeddings.service';
export { searchSimilarChunks, checkPgvectorSupport } from './vectorstore/vectorStore';
