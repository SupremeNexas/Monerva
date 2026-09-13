import { prisma } from '../../../db/prisma';
import { getVisionAIProvider } from '../providers/provider';

export interface ScannedItem {
  name: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

export interface BillDraft {
  merchant: string | null;
  description: string | null;
  date: string | null;
  time: string | null;
  total: string | null;
  subtotal: string | null;
  tax: string | null;
  tip: string | null;
  currency: string | null;
  category: string | null;
  categoryId: string | null;
  items: ScannedItem[];
  paymentMethod: string | null;
  location: string | null;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

export interface DuplicateMatch {
  id: string;
  title: string;
  amount: string;
  date: string;
}

export interface DuplicateWarning {
  possibleDuplicate: boolean;
  matches: DuplicateMatch[];
}

export interface ScanBillResult {
  success: boolean;
  draft: BillDraft;
  warnings: ValidationWarning[];
  uncertainFields: string[];
  duplicateWarning: DuplicateWarning | null;
}

// Known category synonyms map for deterministic resolution
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'food & dining': ['restaurant', 'dining', 'bistro', 'café', 'cafe', 'food', 'eatery', 'diner', 'burger', 'pizza', 'fast food', 'bakery'],
  'food': ['restaurant', 'dining', 'bistro', 'café', 'cafe', 'eatery', 'diner', 'burger', 'pizza', 'fast food', 'bakery'],
  'travel': ['taxi', 'uber', 'ola', 'cab', 'flight', 'airline', 'train', 'transit', 'commute', 'ride', 'travel', 'transportation'],
  'fuel': ['petrol', 'gas', 'diesel', 'fuel', 'gas station', 'shell'],
  'shopping': ['store', 'amazon', 'zara', 'mart', 'supermarket', 'apparel', 'clothing', 'retail', 'shopping', 'groceries', 'flipkart'],
  'utilities': ['electricity', 'water', 'power', 'internet', 'utility', 'utilities', 'bills', 'recharge', 'telecom'],
  'bills': ['electricity', 'water', 'power', 'internet', 'utility', 'utilities', 'bills', 'recharge', 'telecom'],
  'entertainment': ['movie', 'cinema', 'netflix', 'spotify', 'entertainment', 'concert', 'leisure', 'theatre', 'show'],
  'health': ['hospital', 'pharmacy', 'doctor', 'medical', 'health', 'medicine', 'clinic']
};

export class BillScannerService {
  /**
   * Process a receipt/bill image buffer safely without writing to disk or DB.
   * Uses Gemini 2.5 Flash Vision multimodal model for real extraction.
   */
  static async scanBill(
    userId: string,
    workspaceId: string,
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<ScanBillResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[BillScanner] GEMINI_API_KEY is missing. Real receipt scanning unavailable.');
      throw new Error('UNAVAILABLE');
    }

    const provider = getVisionAIProvider();

    const prompt = `You are an expert financial receipt and bill scanner.
Extract expense and bill details from this image.
Return ONLY raw JSON matching this format (no markdown formatting, no code block backticks):
{
  "merchant": "Merchant/Company name or null if unknown",
  "description": "Short expense title/description or null",
  "date": "YYYY-MM-DD date string or null if unknown",
  "time": "HH:MM time string or null if unknown",
  "total": 1416.00 or null,
  "subtotal": 1200.00 or null,
  "tax": 216.00 or null,
  "tip": 0.00 or null,
  "currency": "3-letter currency string like USD, INR, EUR or null if unknown",
  "category": "Suggested category name (e.g. Food & Dining, Travel, Shopping, Utilities, Entertainment, Health, Bills, Other) or null",
  "items": [
    {
      "name": "Item name",
      "quantity": 1 or null,
      "unitPrice": 600.00 or null,
      "total": 600.00 or null
    }
  ],
  "paymentMethod": "Payment method if visible (e.g. Cash, Credit Card, Debit Card, UPI) or null",
  "location": "Address or location if visible or null",
  "confidence": 0.95,
  "uncertainFields": []
}

IMPORTANT INSTRUCTIONS:
- Do NOT guess or hallucinate values. If a field cannot be determined from the image with reasonable certainty, set it to null and add its field name to "uncertainFields".
- Ensure date is strictly formatted as YYYY-MM-DD or null.
- Ensure total, subtotal, tax, tip are numbers or null.`;

    let rawResult: any = null;
    try {
      rawResult = await provider.generateMultimodalJSON<any>(
        fileBuffer,
        mimeType,
        prompt
      );
    } catch (err: any) {
      console.error('[BillScanner] Gemini Vision extraction failed:', err?.message || err);
      throw new Error('EXTRACTION_FAILED');
    }

    if (!rawResult || typeof rawResult !== 'object') {
      throw new Error('EXTRACTION_FAILED');
    }

    return await this.buildDraftResponse(userId, workspaceId, rawResult);
  }

  /**
   * Helper to normalize monetary values safely without floating point distortion.
   */
  static formatAmount(val: any): string | null {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    if (isNaN(num) || !isFinite(num)) return null;
    return num.toFixed(2);
  }

  /**
   * Helper to normalize string values safely.
   */
  static formatString(val: any): string | null {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'unknown') return null;
    return str;
  }

  /**
   * Clean noise from merchant title for duplicate string comparison.
   */
  static normalizeMerchantName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc|ltd|llc|pvt|corp|corporation|co|company|store|retail)\b/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Build draft, map categories, run financial sanity checks, and detect duplicates.
   */
  static async buildDraftResponse(
    userId: string,
    workspaceId: string,
    rawResult: any
  ): Promise<ScanBillResult> {
    const uncertainFields: string[] = Array.isArray(rawResult.uncertainFields)
      ? rawResult.uncertainFields.map((f: any) => String(f))
      : [];

    const merchant = this.formatString(rawResult.merchant);
    const description = this.formatString(rawResult.description);
    let date = this.formatString(rawResult.date);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = null;
      if (!uncertainFields.includes('date')) uncertainFields.push('date');
    }
    const time = this.formatString(rawResult.time);
    const total = this.formatAmount(rawResult.total);
    const subtotal = this.formatAmount(rawResult.subtotal);
    const tax = this.formatAmount(rawResult.tax);
    const tip = this.formatAmount(rawResult.tip);
    const currency = this.formatString(rawResult.currency) || 'USD';
    const paymentMethod = this.formatString(rawResult.paymentMethod);
    const location = this.formatString(rawResult.location);

    if (!merchant && !uncertainFields.includes('merchant')) uncertainFields.push('merchant');
    if (!date && !uncertainFields.includes('date')) uncertainFields.push('date');
    if (!total && !uncertainFields.includes('total')) uncertainFields.push('total');

    // Parse items
    const rawItems = Array.isArray(rawResult.items) ? rawResult.items : [];
    const items: ScannedItem[] = rawItems.map((it: any) => {
      const itName = this.formatString(it.name) || 'Item';
      const itQty = typeof it.quantity === 'number' ? it.quantity : (it.quantity ? parseInt(String(it.quantity)) : null);
      const itUnitPrice = typeof it.unitPrice === 'number' ? it.unitPrice : (it.unitPrice ? parseFloat(String(it.unitPrice)) : null);
      const itTotal = typeof it.total === 'number' ? it.total : (it.total ? parseFloat(String(it.total)) : null);
      return {
        name: itName,
        quantity: isNaN(itQty as number) ? null : itQty,
        unitPrice: isNaN(itUnitPrice as number) ? null : itUnitPrice,
        total: isNaN(itTotal as number) ? null : itTotal
      };
    });

    // 1. Category Mapping (Read-Only)
    const rawAiCategory: string | null = this.formatString(rawResult.category);
    let categoryName: string | null = rawAiCategory;
    let categoryId: string | null = null;

    try {
      const userCategories = await prisma.category.findMany({
        where: {
          OR: [
            { userId },
            { workspaceId },
            { userId: null }
          ]
        }
      });

      if (rawAiCategory && userCategories.length > 0) {
        const aiLower = rawAiCategory.toLowerCase();

        // Step 1: Exact Name Match
        let matched = userCategories.find(c => c.name.toLowerCase() === aiLower);

        // Step 2: Contains Name Match
        if (!matched) {
          matched = userCategories.find(c =>
            c.name.toLowerCase().includes(aiLower) || aiLower.includes(c.name.toLowerCase())
          );
        }

        // Step 3: Synonym Dictionary Match
        if (!matched) {
          for (const cat of userCategories) {
            const catLower = cat.name.toLowerCase();
            const synonyms = CATEGORY_SYNONYMS[catLower] || [];
            if (synonyms.some(syn => aiLower.includes(syn) || syn.includes(aiLower))) {
              matched = cat;
              break;
            }
          }
        }

        // Step 4: Merchant Keyword Fallback Match
        if (!matched && merchant) {
          const mNorm = this.normalizeMerchantName(merchant);
          for (const cat of userCategories) {
            const catLower = cat.name.toLowerCase();
            const synonyms = CATEGORY_SYNONYMS[catLower] || [];
            if (synonyms.some(syn => mNorm.includes(syn))) {
              matched = cat;
              break;
            }
          }
        }

        if (matched) {
          categoryName = matched.name;
          categoryId = matched.id;
        } else {
          // Unmapped: keep AI string suggestion for UI preview, but leave categoryId null
          categoryId = null;
        }
      }
    } catch (dbErr) {
      console.warn('[BillScanner] Category lookup error:', dbErr);
    }

    // 2. Financial Validation & Sanity Checks
    const warnings: ValidationWarning[] = [];
    const nTotal = total ? parseFloat(total) : null;
    const nSubtotal = subtotal ? parseFloat(subtotal) : null;
    const nTax = tax ? parseFloat(tax) : 0;
    const nTip = tip ? parseFloat(tip) : 0;

    if (nTotal !== null && nSubtotal !== null) {
      const calcTotal = nSubtotal + nTax + nTip;
      if (Math.abs(calcTotal - nTotal) > 0.05) {
        warnings.push({
          code: 'TOTAL_MISMATCH',
          message: 'Receipt totals do not appear to match.'
        });
      }
    }

    if (items.length > 0 && nSubtotal !== null) {
      const sumItems = items.reduce((acc, it) => acc + (it.total || 0), 0);
      if (sumItems > 0 && Math.abs(sumItems - nSubtotal) > 0.05) {
        warnings.push({
          code: 'LINE_ITEM_MISMATCH',
          message: 'Line item totals do not match subtotal.'
        });
      }
    }

    // 3. Duplicate Detection (Read-Only & Workspace Isolated)
    let duplicateWarning: DuplicateWarning | null = null;
    try {
      if (nTotal !== null || merchant || date) {
        const candidateTx = await prisma.transaction.findMany({
          where: {
            workspaceId
          },
          select: {
            id: true,
            title: true,
            amount: true,
            date: true
          },
          take: 100,
          orderBy: { date: 'desc' }
        });

        const normMerchant = merchant ? this.normalizeMerchantName(merchant) : '';

        const matches: DuplicateMatch[] = candidateTx.filter(t => {
          const tAmount = Number(t.amount);
          // Tolerance for amount comparison: <= 0.01
          const amountMatch = nTotal !== null && Math.abs(tAmount - nTotal) <= 0.01;

          let dateMatch = false;
          if (date) {
            const tDateStr = t.date.toISOString().split('T')[0];
            dateMatch = tDateStr === date;
          }

          let merchantMatch = false;
          if (normMerchant) {
            const tNormTitle = this.normalizeMerchantName(t.title);
            merchantMatch = tNormTitle.includes(normMerchant) || normMerchant.includes(tNormTitle);
          }

          // Flag candidate as potential duplicate if amount matches AND (date matches OR merchant matches)
          return amountMatch && (dateMatch || merchantMatch);
        }).map(t => ({
          id: t.id,
          title: t.title,
          amount: Number(t.amount).toFixed(2),
          date: t.date.toISOString().split('T')[0]
        }));

        if (matches.length > 0) {
          duplicateWarning = {
            possibleDuplicate: true,
            matches
          };
        }
      }
    } catch (dupErr) {
      console.warn('[BillScanner] Duplicate detection error:', dupErr);
    }

    const draft: BillDraft = {
      merchant,
      description,
      date,
      time,
      total,
      subtotal,
      tax,
      tip,
      currency,
      category: categoryName,
      categoryId,
      items,
      paymentMethod,
      location
    };

    return {
      success: true,
      draft,
      warnings,
      uncertainFields,
      duplicateWarning
    };
  }
}
