import { Router, Response } from 'express';
import { body, query, param } from 'express-validator';
import { prisma } from '../db/prisma';
import { requireWorkspaceRole, WorkspaceRequest } from '../middleware/rbac';
import { Prisma } from '@prisma/client';
import { validate } from '../middleware/validation';
import { logAction } from '../services/audit/log';
import { triggerAutomations } from '../services/automation/engine';
import { convertCurrency } from '../services/currency/converter';
import {
  parseCSV,
  stringifyCSV,
  parseFlexibleDate,
  parseFlexibleAmount,
  autoDetectMapping,
  RowValidationResult,
  MappedFieldData
} from '../services/csv/csvService';

const router = Router();

const expenseRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be at most 200 characters'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('category_id').notEmpty().withMessage('Category is required').isUUID().withMessage('Category ID must be a valid UUID'),
  body('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be at most 500 characters'),
  body('payment_method').optional().trim().isLength({ max: 100 }).withMessage('Payment method must be at most 100 characters'),
  body('wallet_id').optional().trim().isUUID().withMessage('Wallet ID must be a valid UUID'),
  body('type').optional().isIn(['EXPENSE', 'INCOME', 'TRANSFER']).withMessage('Type must be EXPENSE, INCOME, or TRANSFER'),
  body('tags').optional().isArray().withMessage('Tags must be an array of strings'),
  body('tags.*').optional().isString().trim().notEmpty().withMessage('Each tag must be a non-empty string'),
];

const listExpensesRules = [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be an integer between 1 and 12'),
  query('year').optional().isInt({ min: 1000, max: 9999 }).withMessage('Year must be a 4-digit integer'),
  query('category_id').optional().isString().trim(),
  query('wallet_id').optional().isString().trim(),
  query('search').optional().isString().trim(),
  query('sort').optional().isIn(['date', 'title', 'amount', 'category', 'wallet', 'type', 'payment_method']).withMessage('Invalid sort field'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('minAmount').optional().isFloat({ min: 0 }).withMessage('minAmount must be a positive number'),
  query('maxAmount').optional().isFloat({ min: 0 }).withMessage('maxAmount must be a positive number'),
  query('amount').optional().isFloat({ min: 0 }).withMessage('amount must be a positive number'),
  query('startDate').optional().isString().trim(),
  query('endDate').optional().isString().trim(),
  query('payment_method').optional().isString().trim(),
  query('tags').optional().isString().trim(),
  query('type').optional().isString().trim(),
  query('scope').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be an integer >= 1'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be an integer between 1 and 200'),
];

const idParamRules = [
  param('id').isUUID().withMessage('Invalid transaction ID format'),
];

const plaidExchangeRules = [
  body('public_token').trim().notEmpty().withMessage('Public token is required').isString().withMessage('Public token must be a string'),
  body('institution').optional().trim().notEmpty().withMessage('Institution name cannot be empty').isString().withMessage('Institution name must be a string').isLength({ max: 100 }).withMessage('Institution name must be at most 100 characters'),
];

// Helper to get or create a default wallet for a workspace
async function getOrCreateWorkspaceWallet(userId: string, workspaceId: string, paymentMethod?: string, walletId?: string) {
  if (walletId) {
    const w = await prisma.wallet.findFirst({ where: { id: walletId, workspaceId } });
    if (w) return w;
  }

  // Map payment method to type
  let type = 'BANK';
  let name = 'Main Account';
  if (paymentMethod === 'Cash') {
    type = 'CASH';
    name = 'Cash Wallet';
  } else if (paymentMethod === 'Credit Card') {
    type = 'CREDIT_CARD';
    name = 'Credit Card';
  } else if (paymentMethod === 'UPI') {
    type = 'UPI';
    name = 'UPI Wallet';
  }

  // Find existing wallet of this type
  let wallet = await prisma.wallet.findFirst({
    where: { workspaceId, type }
  });

  if (!wallet) {
    // Check if any wallet exists, if so return first
    wallet = await prisma.wallet.findFirst({ where: { workspaceId } });
  }

  if (!wallet) {
    // Create new wallet
    wallet = await prisma.wallet.create({
      data: {
        userId,
        workspaceId,
        name,
        type,
        balance: 10000.00,
        color: '#10B981'
      }
    });
  }

  return wallet;
}

// GET /api/expenses/wallets
router.get('/wallets', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    let wallets = await prisma.wallet.findMany({
      where: { workspaceId: req.workspaceId }
    });

    if (wallets.length === 0) {
      const defaultWallet = await prisma.wallet.create({
        data: {
          userId: req.user.id,
          workspaceId: req.workspaceId,
          name: 'Cash Wallet',
          type: 'CASH',
          balance: 10000
        }
      });
      wallets = [defaultWallet];
    }

    res.json(wallets);
  } catch (err) {
    console.error('Error fetching wallets:', err);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// GET /api/expenses/export - Export workspace transactions to CSV based on active filters
router.get('/export', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), listExpensesRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      month,
      year,
      category_id,
      wallet_id,
      search,
      sort = 'date',
      order = 'desc',
      amount,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      payment_method,
      tags,
      type,
      scope
    } = req.query;

    const whereClause: Prisma.TransactionWhereInput = {
      workspaceId: req.workspaceId
    };

    if (search && String(search).trim() !== '') {
      const s = String(search).trim();
      whereClause.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { paymentMethod: { contains: s, mode: 'insensitive' } },
        { tags: { has: s } },
        { category: { name: { contains: s, mode: 'insensitive' } } },
        { wallet: { name: { contains: s, mode: 'insensitive' } } }
      ];
    }

    if (category_id && category_id !== '') {
      const catIds = String(category_id).split(',').map(id => id.trim()).filter(Boolean);
      if (catIds.length === 1) {
        whereClause.categoryId = catIds[0];
      } else if (catIds.length > 1) {
        whereClause.categoryId = { in: catIds };
      }
    }

    if (wallet_id && wallet_id !== '') {
      const walletIds = String(wallet_id).split(',').map(id => id.trim()).filter(Boolean);
      if (walletIds.length === 1) {
        whereClause.walletId = walletIds[0];
      } else if (walletIds.length > 1) {
        whereClause.walletId = { in: walletIds };
      }
    }

    if (amount !== undefined && amount !== '') {
      whereClause.amount = new Prisma.Decimal(Number(amount));
    } else if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {};
      if (minAmount !== undefined && minAmount !== '') {
        whereClause.amount.gte = new Prisma.Decimal(Number(minAmount));
      }
      if (maxAmount !== undefined && maxAmount !== '') {
        whereClause.amount.lte = new Prisma.Decimal(Number(maxAmount));
      }
    }

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        const eDate = new Date(endDate as string);
        if (String(endDate).length === 10) {
          eDate.setHours(23, 59, 59, 999);
        }
        whereClause.date.lte = eDate;
      }
    } else if (month && year) {
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else if (year) {
      const y = parseInt(year as string);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    }

    if (payment_method && payment_method !== '') {
      whereClause.paymentMethod = { equals: payment_method as string, mode: 'insensitive' };
    }

    if (tags && tags !== '') {
      const tagList = String(tags).split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereClause.tags = { hasSome: tagList };
      }
    }

    if (type && type !== '' && String(type).toUpperCase() !== 'ALL') {
      whereClause.type = String(type).toUpperCase();
    }

    if (scope && scope !== '' && String(scope).toUpperCase() !== 'ALL') {
      const sc = String(scope).toUpperCase();
      if (sc === 'PERSONAL') {
        whereClause.AND = [
          ...(whereClause.AND ? (Array.isArray(whereClause.AND) ? whereClause.AND : [whereClause.AND]) : []),
          { NOT: { tags: { hasSome: ['shared', 'group', 'friend', 'Splitwise'] } } }
        ];
      } else if (sc === 'SHARED' || sc === 'GROUP' || sc === 'FRIEND') {
        const searchTags = sc === 'GROUP' ? ['group'] : sc === 'FRIEND' ? ['friend'] : ['shared', 'group', 'friend', 'Splitwise'];
        whereClause.tags = { hasSome: searchTags };
      }
    }

    let orderBy: Prisma.TransactionOrderByWithRelationInput = { date: order === 'asc' ? 'asc' : 'desc' };
    if (sort === 'title') {
      orderBy = { title: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'amount') {
      orderBy = { amount: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'category') {
      orderBy = { category: { name: order === 'asc' ? 'asc' : 'desc' } };
    } else if (sort === 'wallet') {
      orderBy = { wallet: { name: order === 'asc' ? 'asc' : 'desc' } };
    } else if (sort === 'type') {
      orderBy = { type: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'payment_method') {
      orderBy = { paymentMethod: order === 'asc' ? 'asc' : 'desc' };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        wallet: true,
        user: { select: { baseCurrency: true } }
      },
      orderBy
    });

    const userSettings = await prisma.settings.findFirst({ where: { userId: req.user.id } });
    const currency = userSettings?.currency || (req.user as any).baseCurrency || 'USD';

    const headers = [
      'Date',
      'Type',
      'Title',
      'Amount',
      'Currency',
      'Category',
      'Wallet',
      'Payment Method',
      'Tags',
      'Notes',
      'Location'
    ];

    const rows = transactions.map(t => [
      t.date ? new Date(t.date).toISOString().substring(0, 10) : '',
      t.type,
      t.title,
      Number(t.amount).toFixed(2),
      t.wallet?.currency || currency,
      t.category?.name || 'Uncategorized',
      t.wallet?.name || 'Main Account',
      t.paymentMethod || '',
      Array.isArray(t.tags) ? t.tags.join('; ') : '',
      t.notes || '',
      t.location || ''
    ]);

    const csvOutput = stringifyCSV(headers, rows);

    await logAction(
      req.user.id,
      req.workspaceId,
      'CSV_EXPORT',
      'Transaction',
      null,
      null,
      { count: transactions.length }
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="monerva_expenses_${new Date().toISOString().substring(0, 10)}.csv"`);
    res.send(csvOutput);
  } catch (err) {
    console.error('Error exporting expenses CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// POST /api/expenses/import/preview - Validate and preview CSV rows without database writes
router.post('/import/preview', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const { csvText, columnMapping: customMapping, rows: rawMatrix } = req.body;

    let matrix: string[][] = [];
    if (typeof csvText === 'string' && csvText.trim()) {
      matrix = parseCSV(csvText);
    } else if (Array.isArray(rawMatrix)) {
      matrix = rawMatrix;
    }

    if (matrix.length < 2) {
      return res.status(400).json({ error: 'CSV file is empty or contains no data rows' });
    }

    const headers = matrix[0].map(h => h.trim());
    const dataRows = matrix.slice(1);

    const mapping = customMapping && Object.keys(customMapping).length > 0
      ? customMapping
      : autoDetectMapping(headers);

    // Fetch existing categories & wallets for mapping context
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { workspaceId: req.workspaceId },
          { userId: req.user.id },
          { userId: null }
        ]
      }
    });

    const wallets = await prisma.wallet.findMany({
      where: { workspaceId: req.workspaceId }
    });

    // Fetch existing workspace transactions for duplicate detection
    const existingTxns = await prisma.transaction.findMany({
      where: { workspaceId: req.workspaceId },
      select: { date: true, title: true, amount: true }
    });

    // Map existing transactions into a quick lookup key: `${dateStr}_${titleNorm}_${amountStr}`
    const existingKeys = new Set(
      existingTxns.map((t) => {
        const dStr = new Date(t.date).toISOString().substring(0, 10);
        const titleNorm = t.title.trim().toLowerCase();
        const amtStr = Number(t.amount).toFixed(2);
        return `${dStr}_${titleNorm}_${amtStr}`;
      })
    );

    const seenInCSVKeys = new Set<string>();

    const validationResults: RowValidationResult[] = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    dataRows.forEach((row, idx) => {
      const rowIndex = idx + 1; // 1-based index for UI display
      const rowObj: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = row[colIdx] || '';
      });

      const errors: string[] = [];
      const warnings: string[] = [];

      // Extract field values based on mapping
      const rawDate = mapping.date ? rowObj[mapping.date] || '' : '';
      const rawTitle = mapping.title ? rowObj[mapping.title] || '' : '';
      const rawAmount = mapping.amount ? rowObj[mapping.amount] || '' : '';
      const rawType = mapping.type ? rowObj[mapping.type] || '' : '';
      const rawCategory = mapping.category ? rowObj[mapping.category] || '' : '';
      const rawWallet = mapping.wallet ? rowObj[mapping.wallet] || '' : '';
      const rawPaymentMethod = mapping.paymentMethod ? rowObj[mapping.paymentMethod] || '' : '';
      const rawTags = mapping.tags ? rowObj[mapping.tags] || '' : '';
      const rawNotes = mapping.notes ? rowObj[mapping.notes] || '' : '';

      // Date validation
      const parsedDate = parseFlexibleDate(rawDate);
      if (!parsedDate) {
        errors.push(rawDate ? `Invalid date format: "${rawDate}"` : 'Missing date');
      }

      // Title validation
      const title = rawTitle.trim();
      if (!title) {
        errors.push('Missing title/merchant');
      }

      // Amount validation
      const parsedAmountObj = parseFlexibleAmount(rawAmount);
      let amount = parsedAmountObj?.amount || null;
      if (amount === null) {
        errors.push(rawAmount ? `Invalid amount: "${rawAmount}"` : 'Missing amount');
      }

      // Type resolution (EXPENSE or INCOME)
      let type: 'EXPENSE' | 'INCOME' = 'EXPENSE';
      if (rawType.trim()) {
        const normT = rawType.trim().toUpperCase();
        if (normT.includes('INCOME') || normT.includes('CREDIT') || normT === 'CR') {
          type = 'INCOME';
        }
      } else if (parsedAmountObj?.type === 'EXPENSE') {
        type = 'EXPENSE';
      }

      // Category matching
      let categoryName = rawCategory.trim();
      let matchedCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
      if (!matchedCategory && categoryName) {
        warnings.push(`Category "${categoryName}" not found; will map to General/Uncategorized`);
      }
      categoryName = matchedCategory ? matchedCategory.name : (categoryName || 'Uncategorized');

      // Wallet matching
      let walletName = rawWallet.trim();
      let matchedWallet = wallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
      if (!matchedWallet && walletName) {
        warnings.push(`Wallet "${walletName}" not found; will map to default wallet`);
      }
      walletName = matchedWallet ? matchedWallet.name : (wallets[0]?.name || 'Main Account');

      // Tags parsing
      const tags = rawTags
        ? rawTags.split(/[,;]/).map(t => t.trim()).filter(Boolean)
        : [];

      const mappedData: MappedFieldData = {
        date: parsedDate ? parsedDate.toISOString().substring(0, 10) : rawDate,
        parsedDate,
        title,
        amount,
        type,
        categoryName,
        walletName,
        paymentMethod: rawPaymentMethod.trim() || 'Card',
        tags,
        notes: rawNotes.trim(),
        location: ''
      };

      let status: 'valid' | 'duplicate' | 'invalid' = 'valid';
      let duplicateDetails: string | null = null;

      if (errors.length > 0) {
        status = 'invalid';
        invalidCount++;
      } else if (parsedDate && title && amount !== null) {
        const dStr = parsedDate.toISOString().substring(0, 10);
        const titleNorm = title.toLowerCase();
        const amtStr = amount.toFixed(2);
        const key = `${dStr}_${titleNorm}_${amtStr}`;

        if (existingKeys.has(key)) {
          status = 'duplicate';
          duplicateDetails = `Matches existing database transaction on ${dStr} (${title}, $${amtStr})`;
          duplicateCount++;
        } else if (seenInCSVKeys.has(key)) {
          status = 'duplicate';
          duplicateDetails = `Duplicate of row earlier in this CSV file on ${dStr} (${title}, $${amtStr})`;
          duplicateCount++;
        } else {
          seenInCSVKeys.add(key);
          validCount++;
        }
      }

      validationResults.push({
        rowIndex,
        status,
        errors,
        warnings,
        data: mappedData,
        duplicateDetails
      });
    });

    res.json({
      totalRows: dataRows.length,
      validRowsCount: validCount,
      duplicateRowsCount: duplicateCount,
      invalidRowsCount: invalidCount,
      detectedHeaders: headers,
      columnMapping: mapping,
      categories: categories.map(c => ({ id: c.id, name: c.name })),
      wallets: wallets.map(w => ({ id: w.id, name: w.name })),
      rows: validationResults
    });
  } catch (err) {
    console.error('Error previewing CSV import:', err);
    res.status(500).json({ error: 'Failed to parse and preview CSV' });
  }
});

// POST /api/expenses/import/commit - Commit validated CSV rows into database
router.post('/import/commit', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const { rows, skipDuplicates = true } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided for import' });
    }

    // Workspace & user identity derived exclusively from auth context
    const userId = req.user.id;
    const workspaceId = req.workspaceId;

    // Load available workspace categories & wallets
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { workspaceId },
          { userId },
          { userId: null }
        ]
      }
    });

    let defaultCategory = categories.find(c => c.name.toLowerCase() === 'uncategorized' || c.name.toLowerCase() === 'general') || categories[0];
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'Uncategorized',
          color: '#6B7280',
          icon: 'Tag',
          type: 'EXPENSE',
          workspaceId
        }
      });
    }

    const defaultWallet = await getOrCreateWorkspaceWallet(userId, workspaceId);
    const wallets = await prisma.wallet.findMany({ where: { workspaceId } });

    let importedCount = 0;
    let skippedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    // Filter valid rows to process
    const rowsToImport: any[] = [];

    for (const r of rows) {
      const data = r.data || r;
      if (!data || !data.date || !data.title || !data.amount || Number(data.amount) <= 0) {
        invalidCount++;
        continue;
      }

      if (r.status === 'duplicate' && skipDuplicates) {
        duplicateCount++;
        skippedCount++;
        continue;
      }

      rowsToImport.push(data);
    }

    // Process rows in safe transactional chunks (e.g. 50 at a time)
    const chunkSize = 50;
    for (let i = 0; i < rowsToImport.length; i += chunkSize) {
      const chunk = rowsToImport.slice(i, i + chunkSize);

      await prisma.$transaction(async (tx) => {
        for (const item of chunk) {
          const itemDate = new Date(item.date);
          const itemAmount = new Prisma.Decimal(Number(item.amount));
          const itemType = item.type === 'INCOME' ? 'INCOME' : 'EXPENSE';

          // Match category
          let categoryId = defaultCategory.id;
          if (item.categoryName) {
            const matched = categories.find(c => c.name.toLowerCase() === String(item.categoryName).trim().toLowerCase());
            if (matched) categoryId = matched.id;
          }

          // Match wallet
          let wallet = defaultWallet;
          if (item.walletName) {
            const matchedW = wallets.find(w => w.name.toLowerCase() === String(item.walletName).trim().toLowerCase());
            if (matchedW) wallet = matchedW;
          }

          await tx.transaction.create({
            data: {
              userId,
              workspaceId,
              title: item.title,
              amount: itemAmount,
              type: itemType,
              categoryId,
              walletId: wallet.id,
              paymentMethod: item.paymentMethod || 'Card',
              tags: Array.isArray(item.tags) ? item.tags : [],
              notes: item.notes || 'Imported via CSV',
              date: itemDate,
              location: item.location || ''
            }
          });

          // Adjust wallet balance
          const change = Number(itemAmount);
          const balanceChange = itemType === 'EXPENSE' ? -change : change;
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: balanceChange } }
          });

          importedCount++;
        }
      });
    }

    await logAction(
      userId,
      workspaceId,
      'CSV_IMPORT',
      'Transaction',
      null,
      null,
      { imported: importedCount, skipped: skippedCount, duplicates: duplicateCount, invalid: invalidCount }
    );

    res.json({
      success: true,
      summary: {
        total: rows.length,
        imported: importedCount,
        skipped: skippedCount,
        duplicates: duplicateCount,
        invalid: invalidCount
      }
    });
  } catch (err) {
    console.error('Error committing CSV import:', err);
    res.status(500).json({ error: 'Failed to commit CSV import' });
  }
});

// GET /api/expenses - List transactions scoped by workspace with smart filters & pagination
router.get('/', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), listExpensesRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      month,
      year,
      category_id,
      wallet_id,
      search,
      sort = 'date',
      order = 'desc',
      amount,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      payment_method,
      tags,
      type,
      scope,
      page,
      limit
    } = req.query;

    const whereClause: Prisma.TransactionWhereInput = {
      workspaceId: req.workspaceId
    };

    // 1. Search filter (title, notes, location, tags, paymentMethod, category name, wallet name)
    if (search && String(search).trim() !== '') {
      const s = String(search).trim();
      whereClause.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { notes: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { paymentMethod: { contains: s, mode: 'insensitive' } },
        { tags: { has: s } },
        { category: { name: { contains: s, mode: 'insensitive' } } },
        { wallet: { name: { contains: s, mode: 'insensitive' } } }
      ];
    }

    // 2. Category filter
    if (category_id && category_id !== '') {
      const catIds = String(category_id).split(',').map(id => id.trim()).filter(Boolean);
      if (catIds.length === 1) {
        whereClause.categoryId = catIds[0];
      } else if (catIds.length > 1) {
        whereClause.categoryId = { in: catIds };
      }
    }

    // 3. Wallet filter
    if (wallet_id && wallet_id !== '') {
      const walletIds = String(wallet_id).split(',').map(id => id.trim()).filter(Boolean);
      if (walletIds.length === 1) {
        whereClause.walletId = walletIds[0];
      } else if (walletIds.length > 1) {
        whereClause.walletId = { in: walletIds };
      }
    }

    // 4. Amount filters (exact, min, max)
    if (amount !== undefined && amount !== '') {
      whereClause.amount = new Prisma.Decimal(Number(amount));
    } else if (minAmount !== undefined || maxAmount !== undefined) {
      whereClause.amount = {};
      if (minAmount !== undefined && minAmount !== '') {
        whereClause.amount.gte = new Prisma.Decimal(Number(minAmount));
      }
      if (maxAmount !== undefined && maxAmount !== '') {
        whereClause.amount.lte = new Prisma.Decimal(Number(maxAmount));
      }
    }

    // 5. Date range / Month / Year filters
    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        const eDate = new Date(endDate as string);
        if (String(endDate).length === 10) {
          eDate.setHours(23, 59, 59, 999);
        }
        whereClause.date.lte = eDate;
      }
    } else if (month && year) {
      const m = parseInt(month as string);
      const y = parseInt(year as string);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else if (year) {
      const y = parseInt(year as string);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31, 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    }

    // 6. Payment method filter
    if (payment_method && payment_method !== '') {
      whereClause.paymentMethod = { equals: payment_method as string, mode: 'insensitive' };
    }

    // 7. Tags filter
    if (tags && tags !== '') {
      const tagList = String(tags).split(',').map(t => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        whereClause.tags = { hasSome: tagList };
      }
    }

    // 8. Type filter (EXPENSE, INCOME, TRANSFER, REFUND)
    if (type && type !== '' && String(type).toUpperCase() !== 'ALL') {
      whereClause.type = String(type).toUpperCase();
    }

    // 9. Scope filter (PERSONAL, SHARED, GROUP, FRIEND)
    if (scope && scope !== '' && String(scope).toUpperCase() !== 'ALL') {
      const sc = String(scope).toUpperCase();
      if (sc === 'PERSONAL') {
        whereClause.AND = [
          ...(whereClause.AND ? (Array.isArray(whereClause.AND) ? whereClause.AND : [whereClause.AND]) : []),
          { NOT: { tags: { hasSome: ['shared', 'group', 'friend', 'Splitwise'] } } }
        ];
      } else if (sc === 'SHARED' || sc === 'GROUP' || sc === 'FRIEND') {
        const searchTags = sc === 'GROUP' ? ['group'] : sc === 'FRIEND' ? ['friend'] : ['shared', 'group', 'friend', 'Splitwise'];
        whereClause.tags = { hasSome: searchTags };
      }
    }

    // Sorting
    let orderBy: Prisma.TransactionOrderByWithRelationInput = { date: order === 'asc' ? 'asc' : 'desc' };
    if (sort === 'title') {
      orderBy = { title: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'amount') {
      orderBy = { amount: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'category') {
      orderBy = { category: { name: order === 'asc' ? 'asc' : 'desc' } };
    } else if (sort === 'wallet') {
      orderBy = { wallet: { name: order === 'asc' ? 'asc' : 'desc' } };
    } else if (sort === 'type') {
      orderBy = { type: order === 'asc' ? 'asc' : 'desc' };
    } else if (sort === 'payment_method') {
      orderBy = { paymentMethod: order === 'asc' ? 'asc' : 'desc' };
    }

    // Pagination check
    const isPaginated = page !== undefined || limit !== undefined || req.query.paginate === 'true';
    const pageNum = page ? Math.max(1, parseInt(page as string)) : 1;
    const limitNum = limit ? Math.min(200, Math.max(1, parseInt(limit as string))) : 20;

    const totalCount = await prisma.transaction.count({ where: whereClause });

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        category: true,
        wallet: true,
        toWallet: true,
        user: { select: { name: true, email: true } }
      },
      orderBy,
      ...(isPaginated ? { skip: (pageNum - 1) * limitNum, take: limitNum } : {})
    });

    const mapped = transactions.map(t => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      amount: Number(t.amount),
      type: t.type,
      category_id: t.categoryId,
      categoryId: t.categoryId,
      category_name: t.category?.name || 'Uncategorized',
      category_color: t.category?.color || '#6B7280',
      category_icon: t.category?.icon || 'Tag',
      wallet_id: t.walletId,
      walletId: t.walletId,
      wallet_name: t.wallet?.name,
      wallet_type: t.wallet?.type,
      to_wallet_id: t.toWalletId,
      toWalletId: t.toWalletId,
      destination_wallet_name: t.toWallet?.name,
      date: t.date,
      payment_method: t.paymentMethod,
      paymentMethod: t.paymentMethod,
      tags: t.tags,
      notes: t.notes,
      location: t.location,
      attachment_url: t.attachmentUrl,
      receipt_url: t.receiptUrl,
      is_recurring: t.isRecurring,
      isRecurring: t.isRecurring,
      creator: t.user?.name || 'Unknown'
    }));

    if (isPaginated) {
      res.json({
        data: mapped,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      });
    } else {
      res.json(mapped);
    }
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// GET /api/expenses/:id
router.get('/:id', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']), idParamRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const t = await prisma.transaction.findFirst({
      where: { id: req.params.id as string, workspaceId: req.workspaceId },
      include: { category: true }
    });

    if (!t) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({
      id: t.id,
      title: t.title,
      amount: Number(t.amount),
      type: t.type,
      category_id: t.categoryId,
      category_name: t.category.name,
      category_color: t.category.color,
      category_icon: t.category.icon,
      date: t.date,
      payment_method: t.paymentMethod,
      tags: t.tags,
      notes: t.notes,
      location: t.location,
      attachment_url: t.attachmentUrl,
      receipt_url: t.receiptUrl,
      is_recurring: t.isRecurring
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// POST /api/expenses - Create transaction
router.post('/', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), expenseRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, amount, category_id, date, notes = '', payment_method = 'Card', tags = [], wallet_id, to_wallet_id, type = 'EXPENSE' } = req.body;

    const category = await prisma.category.findFirst({
      where: {
        id: category_id,
        OR: [
          { userId: req.user.id },
          { userId: null },
          { workspaceId: req.workspaceId }
        ]
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const wallet = await getOrCreateWorkspaceWallet(req.user.id, req.workspaceId, payment_method, wallet_id);

    let destWallet: any = null;
    if (type === 'TRANSFER') {
      if (!to_wallet_id) {
        return res.status(400).json({ error: 'Destination wallet ID is required for transfers' });
      }
      if (wallet.id === to_wallet_id) {
        return res.status(400).json({ error: 'Source and destination accounts must be different' });
      }
      destWallet = await prisma.wallet.findFirst({
        where: { id: to_wallet_id, workspaceId: req.workspaceId }
      });
      if (!destWallet) {
        return res.status(400).json({ error: 'Unauthorized or invalid destination account' });
      }
    }

    // Multi-currency conversion: Convert wallet currency to workspace base currency if different
    const userSettings = await prisma.settings.findFirst({ where: { userId: req.user.id } });
    const baseCurrency = userSettings?.currency || 'USD';
    const finalAmount = await convertCurrency(Number(amount), wallet.currency, baseCurrency);

    const transaction = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId: req.user.id,
          workspaceId: req.workspaceId,
          title,
          amount: new Prisma.Decimal(finalAmount),
          type,
          categoryId: category_id,
          walletId: wallet.id,
          toWalletId: destWallet ? destWallet.id : null,
          paymentMethod: payment_method,
          tags: Array.isArray(tags) ? tags : [],
          notes,
          date: new Date(date),
        },
        include: { category: true }
      });

      // Update Wallet Balances
      const change = Number(amount);
      if (type === 'EXPENSE') {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: change } }
        });
      } else if (type === 'INCOME') {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: change } }
        });
      } else if (type === 'TRANSFER' && destWallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: change } }
        });
        await tx.wallet.update({
          where: { id: destWallet.id },
          data: { balance: { increment: change } }
        });
      }

      // 1. Immutable Audit Logging
      await logAction(
        req.user.id,
        req.workspaceId,
        'TRANSACTION_CREATE',
        'Transaction',
        transaction.id,
        null,
        transaction,
        tx
      );

      return transaction;
    });

    // 2. Trigger Automations Engine (run outside transaction to prevent holding locks)
    await triggerAutomations(req.workspaceId, 'TRANSACTION_CREATED', transaction);

    res.status(201).json({
      id: transaction.id,
      title: transaction.title,
      amount: Number(transaction.amount),
      type: transaction.type,
      category_id: transaction.categoryId,
      category_name: transaction.category.name,
      category_color: transaction.category.color,
      category_icon: transaction.category.icon,
      date: transaction.date,
      payment_method: transaction.paymentMethod,
      tags: transaction.tags,
      notes: transaction.notes,
    });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id - Edit transaction
router.put('/:id', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), idParamRules, expenseRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });
    const { title, amount, category_id, date, notes = '', payment_method = 'Card', tags = [], wallet_id, to_wallet_id, type = 'EXPENSE' } = req.body;

    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id as string, workspaceId: req.workspaceId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const category = await prisma.category.findFirst({
      where: {
        id: category_id,
        OR: [
          { userId: req.user.id },
          { userId: null },
          { workspaceId: req.workspaceId }
        ]
      }
    });

    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const wallet = await getOrCreateWorkspaceWallet(req.user.id, req.workspaceId, payment_method, wallet_id);

    let destWallet: any = null;
    if (type === 'TRANSFER') {
      if (!to_wallet_id) {
        return res.status(400).json({ error: 'Destination wallet ID is required for transfers' });
      }
      if (wallet.id === to_wallet_id) {
        return res.status(400).json({ error: 'Source and destination accounts must be different' });
      }
      destWallet = await prisma.wallet.findFirst({
        where: { id: to_wallet_id, workspaceId: req.workspaceId }
      });
      if (!destWallet) {
        return res.status(400).json({ error: 'Unauthorized or invalid destination account' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Revert old wallet balance
      const oldAmount = Number(transaction.amount);
      if (transaction.type === 'EXPENSE') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: oldAmount } }
        });
      } else if (transaction.type === 'INCOME') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { decrement: oldAmount } }
        });
      } else if (transaction.type === 'TRANSFER') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: oldAmount } }
        });
        if (transaction.toWalletId) {
          await tx.wallet.update({
            where: { id: transaction.toWalletId },
            data: { balance: { decrement: oldAmount } }
          });
        }
      }

      // 2. Apply new wallet balance
      const newAmount = Number(amount);

      // Convert currency if needed
      const userSettings = await tx.settings.findFirst({ where: { userId: req.user.id } });
      const baseCurrency = userSettings?.currency || 'USD';
      const finalAmount = await convertCurrency(newAmount, wallet.currency, baseCurrency);

      const updated = await tx.transaction.update({
        where: { id: req.params.id as string },
        data: {
          title,
          amount: new Prisma.Decimal(finalAmount),
          type,
          categoryId: category_id,
          walletId: wallet.id,
          toWalletId: destWallet ? destWallet.id : null,
          paymentMethod: payment_method,
          tags: Array.isArray(tags) ? tags : [],
          notes,
          date: new Date(date),
          lastEditorId: req.user.id
        },
        include: { category: true }
      });

      if (type === 'EXPENSE') {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: newAmount } }
        });
      } else if (type === 'INCOME') {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: newAmount } }
        });
      } else if (type === 'TRANSFER' && destWallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: newAmount } }
        });
        await tx.wallet.update({
          where: { id: destWallet.id },
          data: { balance: { increment: newAmount } }
        });
      }

      // Audit Logging
      await logAction(
        req.user.id,
        req.workspaceId,
        'TRANSACTION_UPDATE',
        'Transaction',
        updated.id,
        transaction,
        updated,
        tx
      );

      return updated;
    });

    res.json({
      id: updated.id,
      title: updated.title,
      amount: Number(updated.amount),
      type: updated.type,
      category_id: updated.categoryId,
      category_name: updated.category.name,
      category_color: updated.category.color,
      category_icon: updated.category.icon,
      date: updated.date,
      payment_method: updated.paymentMethod,
      tags: updated.tags,
      notes: updated.notes,
    });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), idParamRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });

    const transaction = await prisma.transaction.findFirst({
      where: { id: req.params.id as string, workspaceId: req.workspaceId }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Revert wallet balance based on type
      const amount = Number(transaction.amount);
      if (transaction.type === 'EXPENSE') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: amount } }
        });
      } else if (transaction.type === 'INCOME') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { decrement: amount } }
        });
      } else if (transaction.type === 'TRANSFER') {
        await tx.wallet.update({
          where: { id: transaction.walletId },
          data: { balance: { increment: amount } }
        });
        if (transaction.toWalletId) {
          await tx.wallet.update({
            where: { id: transaction.toWalletId },
            data: { balance: { decrement: amount } }
          });
        }
      }

      await tx.transaction.delete({
        where: { id: req.params.id as string }
      });

      // Audit Logging
      await logAction(
        req.user.id,
        req.workspaceId,
        'TRANSACTION_DELETE',
        'Transaction',
        transaction.id,
        transaction,
        null,
        tx
      );
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// ── Plaid Bank Sync Simulation ────────────────────────────────────────────────
// POST /api/expenses/plaid/link-token - Generate a mock link token for simulated onboarding
router.post('/plaid/link-token', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), async (req: WorkspaceRequest, res: Response) => {
  res.json({ link_token: "mock-link-token-" + Math.floor(Math.random() * 1000000) });
});

// POST /api/expenses/plaid/exchange-token - Exchange a public token for a mock wallet and sync transactions
router.post('/plaid/exchange-token', requireWorkspaceRole(['OWNER', 'ADMIN', 'EDITOR']), plaidExchangeRules, validate, async (req: WorkspaceRequest, res: Response) => {
  try {
    if (!req.user || !req.workspaceId) return res.status(401).json({ error: 'Unauthorized' });
    const { public_token, institution = 'Chase Bank' } = req.body;

    // Create new wallet representing the linked bank account
    const wallet = await prisma.wallet.create({
      data: {
        userId: req.user.id,
        workspaceId: req.workspaceId,
        name: institution,
        type: 'BANK',
        balance: 4520.50,
        color: '#3B82F6', // Indigo/Blue
        currency: 'USD'
      }
    });

    // Ensure default categories are matched by checking workspace or finding general ones
    let foodCategory = await prisma.category.findFirst({
      where: { name: 'Food', OR: [{ workspaceId: req.workspaceId }, { userId: null }] }
    });
    if (!foodCategory) {
      foodCategory = await prisma.category.create({
        data: { name: 'Food', color: '#EF4444', icon: 'Utensils', type: 'EXPENSE', workspaceId: req.workspaceId }
      });
    }

    let incomeCategory = await prisma.category.findFirst({
      where: { name: 'Income', OR: [{ workspaceId: req.workspaceId }, { userId: null }] }
    });
    if (!incomeCategory) {
      incomeCategory = await prisma.category.create({
        data: { name: 'Income', color: '#10B981', icon: 'Briefcase', type: 'INCOME', workspaceId: req.workspaceId }
      });
    }

    let utilitiesCategory = await prisma.category.findFirst({
      where: { name: 'Utilities', OR: [{ workspaceId: req.workspaceId }, { userId: null }] }
    });
    if (!utilitiesCategory) {
      utilitiesCategory = await prisma.category.create({
        data: { name: 'Utilities', color: '#F59E0B', icon: 'Zap', type: 'EXPENSE', workspaceId: req.workspaceId }
      });
    }

    let entertainmentCategory = await prisma.category.findFirst({
      where: { name: 'Entertainment', OR: [{ workspaceId: req.workspaceId }, { userId: null }] }
    });
    if (!entertainmentCategory) {
      entertainmentCategory = await prisma.category.create({
        data: { name: 'Entertainment', color: '#8B5CF6', icon: 'Film', type: 'EXPENSE', workspaceId: req.workspaceId }
      });
    }

    // Add some realistic mock transactions linked to this wallet
    const mockTxData = [
      { title: 'Monthly Salary Deposit', amount: 3500.00, type: 'INCOME', categoryId: incomeCategory.id, tags: ['Salary', 'Direct Deposit'] },
      { title: 'Whole Foods Market', amount: 154.20, type: 'EXPENSE', categoryId: foodCategory.id, tags: ['Groceries'] },
      { title: 'Netflix USA Monthly', amount: 15.49, type: 'EXPENSE', categoryId: utilitiesCategory.id, tags: ['Subscription'] },
      { title: 'Starbucks Coffee', amount: 6.80, type: 'EXPENSE', categoryId: foodCategory.id, tags: ['Coffee'] },
      { title: 'Movie Night Ticket', amount: 24.50, type: 'EXPENSE', categoryId: entertainmentCategory.id, tags: ['Leisure'] }
    ];

    const createdTransactions = [];
    for (const tx of mockTxData) {
      const t = await prisma.transaction.create({
        data: {
          userId: req.user.id,
          workspaceId: req.workspaceId,
          title: tx.title,
          amount: new Prisma.Decimal(tx.amount),
          type: tx.type,
          categoryId: tx.categoryId,
          walletId: wallet.id,
          paymentMethod: 'Bank Transfer',
          tags: tx.tags,
          date: new Date(),
          notes: 'Auto-synchronized via Plaid Link'
        }
      });
      createdTransactions.push(t);
    }

    // Log the wallet creation auditable action
    await logAction(
      req.user.id,
      req.workspaceId,
      'WALLET_CREATE',
      'Wallet',
      wallet.id,
      null,
      wallet
    );

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        name: wallet.name,
        type: wallet.type,
        balance: Number(wallet.balance),
        currency: wallet.currency
      },
      transactions_count: createdTransactions.length
    });
  } catch (err) {
    console.error('Plaid mock exchange token failed:', err);
    res.status(500).json({ error: 'Failed to exchange mock Plaid token' });
  }
});

export default router;
