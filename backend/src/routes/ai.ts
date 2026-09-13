import { Router, Response } from 'express';
import { prisma } from '../db/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { requireWorkspaceRole, WorkspaceRequest } from '../middleware/rbac';
import { requirePro } from '../middleware/pro';
import multer from 'multer';
import path from 'path';
import {
  getTextAIProvider,
  getVisionAIProvider,
  getUserMemoryProfile,
  generateSpendingInsights,
  detectSubscriptions,
  generateBudgetRecommendations,
  generateSpendingForecast,
  calculateFinancialHealthScore,
  CategorizationResult,
  ReceiptResult,
  AIService,
  FinancialInsightsService,
  VisionAIProvider
} from '../services/ai';
import { BillScannerService } from '../services/ai/scanner/billScanner';
import {
  CATEGORIZE_SYSTEM_INSTRUCTION,
  getCategorizePrompt
} from '../services/ai/prompts';

import rateLimit from 'express-rate-limit';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rate limit AI access to prevent API abuse/cost spikes
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per 15 minutes
  message: { error: 'Too many queries to the AI Assistant. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
} as any);

router.use(aiLimiter);

// In-memory cache to save remote token consumption
const cache: Record<string, { data: any; expiry: number }> = {};

function getCached(key: string): any | null {
  const item = cache[key];
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}

function setCached(key: string, data: any, ttlMs: number = 10 * 60 * 1000) { // 10 minutes cache TTL
  cache[key] = { data, expiry: Date.now() + ttlMs };
}

// POST /api/ai/chat (Conversational Financial Insights - Text LLM + PostgreSQL Retrieval)
router.post('/chat', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), requirePro, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    // Executes Intent classification -> Scoped Prisma SQL retrieval -> Authoritative math -> Text LLM explanation
    const response = await FinancialInsightsService.query(req.user.id, req.workspaceId, message);
    res.json({
      reply: response.answer,
      answer: response.answer,
      charts: response.charts,
      transactions: response.supportingTransactions || response.summary?.transactions || [],
      summary: response.summary,
      keyNumbers: response.keyNumbers,
      relevantPeriod: response.relevantPeriod,
      contributingCategories: response.contributingCategories,
      recommendations: response.recommendations,
      confidence: response.confidence,
      limitations: response.limitations
    });
  } catch (err) {
    console.error('AI chat endpoint error:', err);
    res.status(500).json({ error: 'AI Assistant failed to reply' });
  }
});

// POST /api/ai/categorize (Merchant classification - Text LLM / Memory)
router.post('/categorize', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { merchant } = req.body;
    if (!merchant) return res.status(400).json({ error: 'Merchant is required' });

    // 1. Memory Check: Look up spending preferences first to prevent calling remote LLMs
    const memory = await getUserMemoryProfile(req.user.id);
    const mLower = merchant.toLowerCase();
    const matched = memory.commonMerchants.find(m => mLower.includes(m.merchant) || m.merchant.includes(mLower));

    if (matched) {
      return res.json({
        category: matched.preferredCategory,
        confidence: 1.0,
        reasoning: `Habit memory matching: identified category preference from your transaction ledger.`
      });
    }

    // 2. Query Text LLM provider if merchant is unrecognized (does NOT touch Gemini Vision)
    const provider = getTextAIProvider();
    const prompt = getCategorizePrompt(merchant);
    const result = await provider.generateJSON<CategorizationResult>(
      prompt,
      CATEGORIZE_SYSTEM_INSTRUCTION
    );

    res.json(result);
  } catch (err) {
    console.error('Categorize endpoint error:', err);
    res.status(500).json({ error: 'Failed to categorize merchant' });
  }
});

// POST /api/ai/analyze (Comprehensive financial report feed)
router.post('/analyze', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = (req as any).workspaceId || req.user.defaultWorkspaceId;

    const cacheKey = `analyze:${req.user.id}:${workspaceId || 'default'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const [score, forecast, recommendations, insights] = await Promise.all([
      calculateFinancialHealthScore(req.user.id, workspaceId),
      generateSpendingForecast(req.user.id, workspaceId),
      generateBudgetRecommendations(req.user.id, workspaceId),
      generateSpendingInsights(req.user.id, workspaceId)
    ]);

    const reportFeed = { score, forecast, recommendations, insights };
    setCached(cacheKey, reportFeed);

    res.json(reportFeed);
  } catch (err) {
    console.error('AI analyze endpoint error:', err);
    res.status(500).json({ error: 'AI analysis failed' });
  }
});

// POST /api/ai/forecast
router.post('/forecast', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = (req as any).workspaceId || req.user.defaultWorkspaceId;

    const cacheKey = `forecast:${req.user.id}:${workspaceId || 'default'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const forecast = await generateSpendingForecast(req.user.id, workspaceId);
    setCached(cacheKey, forecast);

    res.json(forecast);
  } catch (err) {
    console.error('AI forecast endpoint error:', err);
    res.status(500).json({ error: 'AI forecasting failed' });
  }
});

// POST /api/ai/subscriptions
router.post('/subscriptions', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = (req as any).workspaceId || req.user.defaultWorkspaceId;

    const cacheKey = `subscriptions:${req.user.id}:${workspaceId || 'default'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const subscriptions = await detectSubscriptions(req.user.id, workspaceId);
    setCached(cacheKey, subscriptions);

    res.json(subscriptions);
  } catch (err) {
    console.error('AI subscriptions endpoint error:', err);
    res.status(500).json({ error: 'AI subscriptions scan failed' });
  }
});

// POST /api/ai/insights
router.post('/insights', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = (req as any).workspaceId || req.user.defaultWorkspaceId;

    const cacheKey = `insights:${req.user.id}:${workspaceId || 'default'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const insights = await generateSpendingInsights(req.user.id, workspaceId);
    setCached(cacheKey, insights);

    res.json(insights);
  } catch (err) {
    console.error('AI insights endpoint error:', err);
    res.status(500).json({ error: 'AI insights generation failed' });
  }
});

// POST /api/ai/scan-bill - Extract receipt/bill info into structured draft (Gemini Vision 2.5 Flash, ZERO DB WRITES)
const scanBillUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
}).any();

router.post('/scan-bill', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), requirePro, (req: WorkspaceRequest, res: Response) => {
  scanBillUpload(req, res, async (err: any) => {
    try {
      if (!req.user || !req.workspaceId) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ success: false, error: 'File size exceeds 5MB limit' });
        }
        return res.status(400).json({ success: false, error: err.message || 'File upload error' });
      }

      const files = (req as any).files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: 'No bill or receipt image file uploaded' });
      }

      if (files.length > 1) {
        return res.status(400).json({ success: false, error: 'Please upload exactly one image' });
      }

      const file = files[0];
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const allowedExts = ['.jpeg', '.jpg', '.png', '.webp'];

      const ext = path.extname(file.originalname || '').toLowerCase();
      const mime = (file.mimetype || '').toLowerCase();

      if (!allowedMimes.includes(mime) || !allowedExts.includes(ext)) {
        return res.status(400).json({ success: false, error: 'Unsupported file type. Allowed formats: JPG, JPEG, PNG, WEBP' });
      }

      // Magic bytes verification
      const buf = file.buffer;
      const isJpeg = buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
      const isPng = buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      const isWebp = buf.length >= 12 && buf.toString('utf8', 0, 4) === 'RIFF' && buf.toString('utf8', 8, 12) === 'WEBP';

      if (!isJpeg && !isPng && !isWebp) {
        return res.status(400).json({ success: false, error: 'Unsupported file type. Allowed formats: JPG, JPEG, PNG, WEBP' });
      }

      const result = await BillScannerService.scanBill(
        req.user.id,
        req.workspaceId,
        file.buffer,
        file.mimetype,
        file.originalname
      );

      return res.json(result);
    } catch (scanErr: any) {
      if (scanErr?.message === 'UNAVAILABLE') {
        return res.status(503).json({ success: false, error: 'Receipt scanning is temporarily unavailable.' });
      }
      console.error('[ScanBill] Error scanning bill:', scanErr);
      return res.status(500).json({ success: false, error: 'Failed to process receipt image' });
    }
  });
});

// POST /api/ai/receipt (Strict Gemini Vision receipt scanning)
router.post('/receipt', authenticate, requirePro, upload.single('receipt'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No receipt file uploaded' });
    }

    let visionProvider: VisionAIProvider;
    try {
      visionProvider = getVisionAIProvider();
    } catch (err: any) {
      return res.status(503).json({ error: 'Receipt scanning is temporarily unavailable. Please configure GEMINI_API_KEY.' });
    }

    const prompt = 'You are an expert financial receipt scanner. Extract the following fields from this receipt image as JSON: merchant, amount (total including tax, as number), tax (as number), date (YYYY-MM-DD format), category (one of: Food, Travel, Fuel, Shopping, Bills, Health, Education, Entertainment, Salary, Investment, Gift, Other), items (list of string items), confidence (estimate from 0 to 1). Return ONLY the raw JSON block without markdown formatting or code blocks.';

    try {
      const parsed = await visionProvider.generateMultimodalJSON<ReceiptResult>(
        file.buffer,
        file.mimetype,
        prompt
      );

      const ocrResult: ReceiptResult = {
        merchant: parsed.merchant || 'Unknown Merchant',
        amount: Number(parsed.amount || 0),
        tax: Number(parsed.tax || 0),
        date: parsed.date || new Date().toISOString().split('T')[0],
        category: parsed.category || 'Other',
        items: parsed.items || [],
        confidence: Number(parsed.confidence || 0.9)
      };

      return res.json(ocrResult);
    } catch (geminiErr) {
      console.error('[Receipt] Gemini Vision OCR failed:', geminiErr);
      return res.status(500).json({ error: 'Failed to process receipt image' });
    }
  } catch (err: any) {
    console.error('[Receipt] Endpoint error:', err);
    return res.status(500).json({ error: 'Failed to process receipt image' });
  }
});

// Map legacy routes/scan-receipt to receipt scanner
router.post('/scan-receipt', authenticate, requirePro, upload.single('receipt'), async (req: AuthenticatedRequest, res: Response) => {
  res.redirect(307, '/api/ai/receipt');
});

// Map legacy GET coach
router.get('/coach', authenticate, requirePro, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const workspaceId = (req as any).workspaceId || req.user.defaultWorkspaceId;
    const insights = await generateSpendingInsights(req.user.id, workspaceId);
    const tips = insights.slice(0, 3).map(i => `${i.title}: ${i.text}`);
    res.json({ tips });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch financial coach advice' });
  }
});

export default router;
