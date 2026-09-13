import { prisma } from '../../../db/prisma';
import { cosineSimilarity } from '../embeddings/embeddings.service';

export interface ChunkQueryResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  metadata: any;
  pageNumber: number | null;
  filename: string;
  originalFilename: string;
  similarity: number;
}

export interface SaveChunkInput {
  documentId: string;
  userId: string;
  workspaceId?: string | null;
  chunkIndex: number;
  content: string;
  embedding: number[];
  metadata: any;
  pageNumber?: number | null;
}

let pgvectorSupported: boolean | null = null;

/**
 * Checks and initializes pgvector extension if available on PostgreSQL server
 */
export async function checkPgvectorSupport(): Promise<boolean> {
  if (pgvectorSupported !== null) return pgvectorSupported;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE document_chunks
      ADD COLUMN IF NOT EXISTS embedding_vec vector(384);
    `);
    pgvectorSupported = true;
    console.log('[VectorStore] pgvector extension verified and ready.');
    return true;
  } catch (err) {
    pgvectorSupported = false;
    console.log('[VectorStore] pgvector native extension not present in PostgreSQL binary. Using array/JSON vector store with cosine similarity.');
    return false;
  }
}

/**
 * Batch saves document chunks with embeddings into database
 */
export async function saveDocumentChunks(chunks: SaveChunkInput[]): Promise<void> {
  if (chunks.length === 0) return;

  const hasPgvector = await checkPgvectorSupport();

  // Create records in Prisma
  for (const chunk of chunks) {
    const created = await prisma.documentChunk.create({
      data: {
        documentId: chunk.documentId,
        userId: chunk.userId,
        workspaceId: chunk.workspaceId || null,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding, // Stores number[] array as JSON
        metadata: chunk.metadata || {},
        pageNumber: chunk.pageNumber || null
      }
    });

    // Sync to pgvector column if pgvector extension is enabled
    if (hasPgvector) {
      try {
        const vecStr = `[${chunk.embedding.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE document_chunks SET embedding_vec = $1::vector WHERE id = $2`,
          vecStr,
          created.id
        );
      } catch (vecErr) {
        console.warn('[VectorStore] Failed to update pgvector column:', vecErr);
      }
    }
  }
}

/**
 * Perform vector similarity search for relevant chunks belonging strictly to the authenticated user/workspace
 */
export async function searchSimilarChunks(params: {
  userId: string;
  workspaceId?: string | null;
  queryVector: number[];
  queryText: string;
  limit?: number;
  documentIds?: string[];
}): Promise<ChunkQueryResult[]> {
  const { userId, workspaceId, queryVector, queryText, limit = 5, documentIds } = params;

  // Build secure where conditions for multi-tenant isolation
  const whereClause: any = { userId };
  if (workspaceId) {
    whereClause.workspaceId = workspaceId;
  }
  if (documentIds && documentIds.length > 0) {
    whereClause.documentId = { in: documentIds };
  }

  // Fetch candidate chunks for user/workspace
  const chunks = await prisma.documentChunk.findMany({
    where: whereClause,
    include: {
      document: {
        select: {
          id: true,
          filename: true,
          originalFilename: true,
          status: true
        }
      }
    }
  });

  if (chunks.length === 0) return [];

  // Filter out any documents that are not INDEXED
  const readyChunks = chunks.filter(c => c.document && c.document.status === 'INDEXED');

  const queryTerms = queryText.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  // Compute vector cosine similarity + keyword boost for financial precision
  const scoredChunks = readyChunks.map(chunk => {
    const embeddingArr = Array.isArray(chunk.embedding)
      ? (chunk.embedding as number[])
      : JSON.parse(String(chunk.embedding) || '[]');

    let similarity = cosineSimilarity(queryVector, embeddingArr);

    // Keyword & numeric exact match boost (Financial RAG optimization)
    const contentLower = chunk.content.toLowerCase();
    let keywordHits = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) {
        keywordHits++;
      }
    }

    if (queryTerms.length > 0 && keywordHits > 0) {
      const boost = (keywordHits / queryTerms.length) * 0.15;
      similarity += boost;
    }

    return {
      id: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      metadata: chunk.metadata,
      pageNumber: chunk.pageNumber,
      filename: chunk.document.filename,
      originalFilename: chunk.document.originalFilename,
      similarity
    };
  });

  // Sort descending by similarity score
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  return scoredChunks.slice(0, limit);
}
