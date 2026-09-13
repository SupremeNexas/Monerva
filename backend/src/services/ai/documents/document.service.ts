import { prisma } from '../../../db/prisma';
import { extractTextFromPdf, chunkDocumentPages, validatePdfBuffer } from './documentProcessor';
import { getEmbeddingProvider } from '../embeddings/embeddings.service';
import { saveDocumentChunks, SaveChunkInput } from '../vectorstore/vectorStore';

export interface UploadDocumentInput {
  userId: string;
  workspaceId?: string | null;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
}

export class DocumentService {
  /**
   * Uploads, extracts, chunks, embeds, and indexes a PDF document
   */
  static async uploadAndIndexDocument(input: UploadDocumentInput) {
    const { userId, workspaceId, fileBuffer, originalFilename, mimeType, fileSize } = input;

    // 1. Validation
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty file uploaded.');
    }

    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('File size exceeds the 10 MB maximum limit.');
    }

    const isPdfExt = originalFilename.toLowerCase().endsWith('.pdf');
    const isPdfMime = mimeType.toLowerCase() === 'application/pdf';

    if (!isPdfExt || !isPdfMime) {
      throw new Error('Unsupported document format. Only PDF documents (.pdf) are currently supported.');
    }

    if (!validatePdfBuffer(fileBuffer)) {
      throw new Error('Corrupted or invalid PDF file header.');
    }

    // 2. Create initial document record with status = PROCESSING
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const document = await prisma.document.create({
      data: {
        userId,
        workspaceId: workspaceId || null,
        filename: safeFilename,
        originalFilename,
        mimeType: 'application/pdf',
        size: fileSize,
        status: 'PROCESSING',
        chunkCount: 0
      }
    });

    try {
      // 3. Extract text page by page
      const pages = await extractTextFromPdf(fileBuffer);

      // 4. Chunk document pages preserving page numbers & financial metadata
      const chunkData = chunkDocumentPages(pages);

      if (chunkData.length === 0) {
        throw new Error('No searchable text could be extracted from PDF document.');
      }

      // 5. Generate vector embeddings for chunks
      const embeddingProvider = getEmbeddingProvider();
      const saveChunks: SaveChunkInput[] = [];

      for (const chunk of chunkData) {
        const embedding = await embeddingProvider.embedText(chunk.content);
        saveChunks.push({
          documentId: document.id,
          userId,
          workspaceId: workspaceId || null,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding,
          metadata: chunk.metadata,
          pageNumber: chunk.pageNumber
        });
      }

      // 6. Save chunks and embeddings into database
      await saveDocumentChunks(saveChunks);

      // 7. Update document status to INDEXED
      const updatedDoc = await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'INDEXED',
          chunkCount: saveChunks.length
        }
      });

      return updatedDoc;
    } catch (err: any) {
      console.error('[DocumentService] Indexing document failed:', err);
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Indexing failed'
        }
      });
      throw err;
    }
  }

  /**
   * Retrieves all documents for the authenticated user and workspace
   */
  static async getUserDocuments(userId: string, workspaceId?: string | null) {
    const where: any = { userId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    return prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        filename: true,
        originalFilename: true,
        mimeType: true,
        size: true,
        status: true,
        errorMessage: true,
        chunkCount: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Retrieves a single document by ID with strict ownership security check
   */
  static async getDocumentById(userId: string, documentId: string, workspaceId?: string | null) {
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) return null;

    // Security check: Verify user identity & workspace authorization
    if (document.userId !== userId) {
      return null; // Reject cross-user access
    }

    if (workspaceId && document.workspaceId && document.workspaceId !== workspaceId) {
      return null; // Reject cross-workspace access
    }

    return document;
  }

  /**
   * Deletes a document and cascades deletion of all associated chunks and vector records
   */
  static async deleteDocument(userId: string, documentId: string, workspaceId?: string | null) {
    const document = await this.getDocumentById(userId, documentId, workspaceId);
    if (!document) {
      throw new Error('Document not found or access denied.');
    }

    // Cascade delete in Prisma (Document -> DocumentChunk)
    await prisma.document.delete({
      where: { id: documentId }
    });

    return { success: true, message: 'Document and all associated vector chunks deleted successfully.' };
  }
}
