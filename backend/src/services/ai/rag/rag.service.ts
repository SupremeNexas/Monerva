import { getEmbeddingProvider } from '../embeddings/embeddings.service';
import { searchSimilarChunks, ChunkQueryResult } from '../vectorstore/vectorStore';
import { formatProtectedRAGContext } from '../security/promptProtection';
import { getTextAIProvider } from '../providers/provider';

export interface RAGSourceCitation {
  filename: string;
  originalFilename: string;
  pageNumber: number | null;
  chunkId: string;
  similarity: number;
}

export interface RAGAnswerResult {
  answer: string;
  sources: RAGSourceCitation[];
  chunksFound: number;
}

export class RAGService {
  /**
   * Performs real RAG query over user's indexed documents
   */
  static async queryDocuments(
    userId: string,
    workspaceId: string | null | undefined,
    userQuery: string
  ): Promise<RAGAnswerResult> {
    // 1. Generate text embedding for user question
    const embeddingProvider = getEmbeddingProvider();
    const queryVector = await embeddingProvider.embedText(userQuery);

    // 2. Execute secure scoped similarity search
    const chunks = await searchSimilarChunks({
      userId,
      workspaceId,
      queryVector,
      queryText: userQuery,
      limit: 5
    });

    // 3. Handle no matching document chunks
    if (!chunks || chunks.length === 0) {
      return {
        answer: "I couldn't find that information in your uploaded documents.",
        sources: [],
        chunksFound: 0
      };
    }

    // Filter relevant chunks above a baseline similarity threshold
    const relevantChunks = chunks.filter(c => c.similarity >= 0.35);

    if (relevantChunks.length === 0) {
      return {
        answer: "I couldn't find that information in your uploaded documents.",
        sources: [],
        chunksFound: 0
      };
    }

    // 4. Protect against document prompt injection and format context
    const protectedContext = formatProtectedRAGContext(relevantChunks);

    const prompt = `
User Question: "${userQuery}"

${protectedContext}

RESPONSE RULES:
1. Answer the user's question based ONLY on the provided document context inside <document_context>.
2. If the document context does not contain the answer, respond: "I couldn't find that information in your uploaded documents."
3. Do NOT make up clauses, dates, numbers, or rules not present in the text.
4. Keep the answer clear, structured, and easy to read.
`;

    const systemInstruction = `You are Monerva AI Document Assistant. You analyze user-uploaded financial documents such as loan agreements, tax forms, insurance policies, and investment reports. You strictly answer based on provided document context without hallucinating.`;

    const provider = getTextAIProvider();
    const rawAnswer = await provider.generateText(prompt, systemInstruction);

    let finalAnswer = rawAnswer?.trim() || "I couldn't find that information in your uploaded documents.";

    if (finalAnswer.includes("couldn't find that information")) {
      return {
        answer: "I couldn't find that information in your uploaded documents.",
        sources: [],
        chunksFound: 0
      };
    }

    // Append citation references to answer if not already formatted
    const sourcesMap = new Map<string, RAGSourceCitation>();
    for (const chunk of relevantChunks) {
      const key = `${chunk.originalFilename || chunk.filename}_${chunk.pageNumber || '0'}`;
      if (!sourcesMap.has(key)) {
        sourcesMap.set(key, {
          filename: chunk.filename,
          originalFilename: chunk.originalFilename || chunk.filename,
          pageNumber: chunk.pageNumber,
          chunkId: chunk.id,
          similarity: Number(chunk.similarity.toFixed(3))
        });
      }
    }

    const sources = Array.from(sourcesMap.values());

    return {
      answer: finalAnswer,
      sources,
      chunksFound: relevantChunks.length
    };
  }
}
