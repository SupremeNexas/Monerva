import { Router, Response } from 'express';
import multer from 'multer';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireWorkspaceRole, WorkspaceRequest } from '../middleware/rbac';
import { DocumentService } from '../services/ai/documents/document.service';
import { RAGService } from '../services/ai/rag/rag.service';
import rateLimit from 'express-rate-limit';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

const docLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many document requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
} as any);

router.use(docLimiter);

// POST /api/documents - Upload and index PDF document
router.post(
  '/',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']),
  upload.single('document'),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No document PDF file provided in request.' });
      }

      const document = await DocumentService.uploadAndIndexDocument({
        userId: req.user.id,
        workspaceId: req.workspaceId,
        fileBuffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      });

      return res.status(201).json({
        success: true,
        message: 'Document uploaded and indexed successfully.',
        document
      });
    } catch (err: any) {
      console.error('[DocumentsRoute] Upload failed:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to process and index document.'
      });
    }
  }
);

// GET /api/documents - List all uploaded documents for active user/workspace
router.get(
  '/',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const documents = await DocumentService.getUserDocuments(req.user.id, req.workspaceId);
      return res.json({ success: true, documents });
    } catch (err: any) {
      console.error('[DocumentsRoute] Failed to list documents:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve documents list.' });
    }
  }
);

// GET /api/documents/:id - Get specific document details
router.get(
  '/:id',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const document = await DocumentService.getDocumentById(req.user.id, req.params.id, req.workspaceId);
      if (!document) {
        return res.status(404).json({ success: false, error: 'Document not found or access denied.' });
      }

      return res.json({ success: true, document });
    } catch (err: any) {
      console.error('[DocumentsRoute] Get document failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve document details.' });
    }
  }
);

// DELETE /api/documents/:id - Delete document and all vector chunks
router.delete(
  '/:id',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const result = await DocumentService.deleteDocument(req.user.id, req.params.id, req.workspaceId);
      return res.json(result);
    } catch (err: any) {
      console.error('[DocumentsRoute] Delete document failed:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to delete document.' });
    }
  }
);

// POST /api/documents/query - Direct document RAG question endpoint
router.post(
  '/query',
  requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']),
  async (req: WorkspaceRequest, res: Response) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ success: false, error: 'Question query string is required.' });
      }

      const ragResult = await RAGService.queryDocuments(req.user.id, req.workspaceId, query);
      return res.json({
        success: true,
        answer: ragResult.answer,
        sources: ragResult.sources,
        chunksFound: ragResult.chunksFound
      });
    } catch (err: any) {
      console.error('[DocumentsRoute] Query RAG failed:', err);
      return res.status(500).json({ success: false, error: 'Failed to execute document query.' });
    }
  }
);

export default router;
