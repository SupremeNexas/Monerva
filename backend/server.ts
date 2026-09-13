import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authenticate } from './src/middleware/auth';
import { errorHandler } from './src/middleware/error';

// Load environment variables dynamically across dev (ts) and build (dist)
const envCandidatePaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env')
];
const foundEnvPath = envCandidatePaths.find(p => fs.existsSync(p));
dotenv.config(foundEnvPath ? { path: foundEnvPath } : undefined);

const app = express();
const PORT = process.env.PORT || 5002;

// ── Security & Hardening ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests from this IP, please try again later.' }
} as any);
app.use('/api/', apiLimiter);

// ── CORS — only allow our configured frontend origin ──────────────────────────
const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS: string[] = [
  'https://expense-tracker-eight-pi-69.vercel.app'
];
if (process.env.CLIENT_URL) {
  const clientUrl = process.env.CLIENT_URL.replace(/\/$/, '');
  if (!ALLOWED_ORIGINS.includes(clientUrl)) {
    ALLOWED_ORIGINS.push(clientUrl);
  }
}
if (!isProduction) {
  ALLOWED_ORIGINS.push('http://localhost:5173');
  ALLOWED_ORIGINS.push('http://localhost:4173');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    const isLocalhost = /^https?:\/\/localhost:\d+$/.test(origin);
    const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin);
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || isVercel || (!isProduction && isLocalhost);
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-workspace-id'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (!isProduction) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Import route modules
import authRouter from './src/routes/auth';
import expensesRouter from './src/routes/expenses';
import categoriesRouter from './src/routes/categories';
import budgetsRouter from './src/routes/budgets';
import creditCardsRouter from './src/routes/credit_cards';
import billsRouter from './src/routes/bills';
import goalsRouter from './src/routes/goals';
import subscriptionsRouter from './src/routes/subscriptions';
import analyticsRouter from './src/routes/analytics';
import insightsRouter from './src/routes/insights';
import groupsRouter from './src/routes/groups';
import friendsRouter from './src/routes/friends';
import alertsRouter from './src/routes/alerts';
import aiRouter from './src/routes/ai';
import documentsRouter from './src/routes/documents';
import recurringRouter from './src/routes/recurring';
import transfersRouter from './src/routes/transfers';

// Enterprise & Platform Scaling (Phase 5)
import workspacesRouter from './src/routes/workspaces';
import automationsRouter from './src/routes/automations';
import searchRouter from './src/routes/search';

// Helper to register API endpoints under versioned namespaces
const mountRoutes = (prefix: string) => {
  // Public Auth
  app.use(`${prefix}/auth`, authRouter);

  // Scoped Workspace Resources
  app.use(`${prefix}/expenses`, authenticate, expensesRouter);
  app.use(`${prefix}/categories`, authenticate, categoriesRouter);
  app.use(`${prefix}/budgets`, authenticate, budgetsRouter);
  app.use(`${prefix}/credit_cards`, authenticate, creditCardsRouter);
  app.use(`${prefix}/bills`, authenticate, billsRouter);
  app.use(`${prefix}/goals`, authenticate, goalsRouter);
  app.use(`${prefix}/subscriptions`, authenticate, subscriptionsRouter);
  app.use(`${prefix}/recurring`, authenticate, recurringRouter);
  app.use(`${prefix}/transfers`, authenticate, transfersRouter);
  app.use(`${prefix}/analytics`, authenticate, analyticsRouter);
  app.use(`${prefix}/insights`, authenticate, insightsRouter);
  app.use(`${prefix}/groups`, authenticate, groupsRouter);
  app.use(`${prefix}/friends`, authenticate, friendsRouter);
  app.use(`${prefix}/ai`, authenticate, aiRouter);
  app.use(`${prefix}/documents`, authenticate, documentsRouter);
  app.use(`${prefix}/alerts`, authenticate, alertsRouter);

  // Workspace Collaboration, Rules & Auditing
  app.use(`${prefix}/workspaces`, authenticate, workspacesRouter);
  app.use(`${prefix}/automations`, authenticate, automationsRouter);
  app.use(`${prefix}/search`, authenticate, searchRouter);
};

// Mount versioned v1 and backward-compatible paths
mountRoutes('/api/v1');
mountRoutes('/api');

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', apiVersion: 'v1', timestamp: new Date().toISOString() });
});

// 404 handler
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use(errorHandler);

import { ensureDefaultWorkspaces } from './src/services/db/init';
import { startSchedulerJobs } from './src/services/jobs/scheduler';

ensureDefaultWorkspaces().then(() => {
  // Start background jobs cron simulator (runs accounting checks every 24 hours)
  startSchedulerJobs(24 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`\n🚀 Finova API running on port ${PORT}`);
    if (!isProduction) {
      console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
    }
  });
});
