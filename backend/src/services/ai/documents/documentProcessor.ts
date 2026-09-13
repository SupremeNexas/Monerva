const pdfParse = require('pdf-parse');

export interface DocumentChunkData {
  chunkIndex: number;
  content: string;
  pageNumber: number;
  metadata: {
    pageNumber: number;
    chunkIndex: number;
    financialKeywords?: string[];
    numericValues?: string[];
    [key: string]: any;
  };
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

/**
 * Validates PDF file header (magic bytes: %PDF-)
 */
export function validatePdfBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 5) return false;
  const header = buffer.toString('utf8', 0, 5);
  return header === '%PDF-';
}

/**
 * Safely extracts raw text from PDF streams when high-level PDF parsers encounter non-standard stream operators
 */
function extractRawTextFromPdfBuffer(buffer: Buffer): ExtractedPage[] {
  const pages: ExtractedPage[] = [];
  const rawStr = buffer.toString('latin1');

  const btRegex = /BT\s+([\s\S]*?)\s+ET/gi;
  let match: RegExpExecArray | null;
  const textItems: string[] = [];

  while ((match = btRegex.exec(rawStr)) !== null) {
    const btContent = match[1];

    const literalRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/g;
    let litMatch: RegExpExecArray | null;
    while ((litMatch = literalRegex.exec(btContent)) !== null) {
      const cleaned = litMatch[1]
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
        .trim();
      if (cleaned) textItems.push(cleaned);
    }

    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrayMatch: RegExpExecArray | null;
    while ((tjArrayMatch = tjArrayRegex.exec(btContent)) !== null) {
      const inner = tjArrayMatch[1];
      const strParts = inner.match(/\(([\s\S]*?)\)/g);
      if (strParts) {
        const line = strParts.map(s =>
          s.slice(1, -1)
            .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\\(/g, '(').replace(/\\\)/g, ')')
        ).join('');
        if (line.trim()) textItems.push(line.trim());
      }
    }
  }

  if (textItems.length > 0) {
    const fullText = textItems.join(' ').replace(/[ \t]+/g, ' ').trim();
    if (fullText) {
      pages.push({ pageNumber: 1, text: fullText });
    }
  }

  return pages;
}

/**
 * Extracts text page-by-page from a PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedPage[]> {
  if (!validatePdfBuffer(buffer)) {
    throw new Error('Invalid PDF file format: missing %PDF- header magic bytes.');
  }

  let pages: ExtractedPage[] = [];

  // Attempt 1: Custom page-by-page rendering with per-page error handling to catch token errors gracefully
  try {
    const options = {
      pagerender: async (pageData: any) => {
        try {
          const textContent = await pageData.getTextContent();
          let lastY: number | null = null;
          let pageText = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || lastY === null) {
              pageText += item.str + ' ';
            } else {
              pageText += '\n' + item.str + ' ';
            }
            lastY = item.transform[5];
          }

          const pageNum = pageData.pageIndex + 1;
          const trimmed = pageText.replace(/[ \t]+/g, ' ').trim();
          if (trimmed) {
            pages.push({ pageNumber: pageNum, text: trimmed });
          }
          return pageText;
        } catch (pageErr: any) {
          console.warn(`[DocumentProcessor] Page ${pageData.pageIndex + 1} textContent warning: ${pageErr?.message || pageErr}`);
          return '';
        }
      }
    };

    await pdfParse(buffer, options);
  } catch (err: any) {
    console.warn(`[DocumentProcessor] Custom page-by-page rendering hit parser warning (${err?.message || err}). Falling back to standard parser...`);
  }

  // Attempt 2: Standard pdfParse if custom pagerender yielded no pages or encountered a document-level parser token error
  if (pages.length === 0) {
    try {
      const parsed = await pdfParse(buffer);
      if (parsed && parsed.text) {
        const splitPages = parsed.text.split('\f');
        splitPages.forEach((rawText, idx) => {
          const text = rawText.replace(/[ \t]+/g, ' ').trim();
          if (text) {
            pages.push({ pageNumber: idx + 1, text });
          }
        });
      }
    } catch (stdErr: any) {
      console.warn(`[DocumentProcessor] Standard pdfParse warning: ${stdErr?.message || stdErr}`);
    }
  }

  // Attempt 3: Raw stream extraction fallback for PDFs with non-standard command operators or encoded streams
  if (pages.length === 0) {
    pages = extractRawTextFromPdfBuffer(buffer);
  }

  if (pages.length === 0) {
    throw new Error('Could not extract readable text from PDF. The PDF may be scanned images without OCR text.');
  }

  return pages;
}

/**
 * Extracts key financial indicators (amounts, percentages, keywords) for metadata enrichment
 */
function extractFinancialMetadata(text: string) {
  const financialKeywordRegex = /\b(interest|rate|prepayment|foreclosure|penalty|emi|loan|tenure|principal|maturity|charge|fee|insurance|coverage|tax|deductible|installment|collateral|default|yield|deposit|balance)\b/gi;
  const numericRegex = /([$₹€£]\s?\d+(?:,\d{3})*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d+(?:,\d{3})*(?:\.\d+)?\s?(?:USD|INR|EUR|GBP|months|years|days|per annum|p\.a\.|per month|p\.m\.)\b)/gi;

  const keywords = Array.from(new Set((text.match(financialKeywordRegex) || []).map(k => k.toLowerCase())));
  const numericValues = Array.from(new Set(text.match(numericRegex) || []));

  return { keywords, numericValues };
}

/**
 * Splits extracted document pages into overlapping chunks preserving page context & financial metadata
 */
export function chunkDocumentPages(
  pages: ExtractedPage[],
  chunkSize: number = 600,
  overlap: number = 120
): DocumentChunkData[] {
  const chunks: DocumentChunkData[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text;
    if (!text) continue;

    // Split text into paragraphs or sentences
    const paragraphs = text.split(/(?:\r?\n){2,}|\.\s+/).map(p => p.trim()).filter(Boolean);
    let currentChunkText = '';

    for (const paragraph of paragraphs) {
      if ((currentChunkText + ' ' + paragraph).length <= chunkSize) {
        currentChunkText = currentChunkText ? `${currentChunkText}. ${paragraph}` : paragraph;
      } else {
        if (currentChunkText) {
          const finMeta = extractFinancialMetadata(currentChunkText);
          chunks.push({
            chunkIndex: globalChunkIndex,
            content: currentChunkText,
            pageNumber: page.pageNumber,
            metadata: {
              pageNumber: page.pageNumber,
              chunkIndex: globalChunkIndex,
              financialKeywords: finMeta.keywords,
              numericValues: finMeta.numericValues
            }
          });
          globalChunkIndex++;
        }

        // Handle overlap from end of current chunk
        const overlapText = currentChunkText.length > overlap
          ? currentChunkText.slice(currentChunkText.length - overlap)
          : currentChunkText;

        currentChunkText = overlapText ? `${overlapText} ${paragraph}` : paragraph;
      }
    }

    if (currentChunkText) {
      const finMeta = extractFinancialMetadata(currentChunkText);
      chunks.push({
        chunkIndex: globalChunkIndex,
        content: currentChunkText,
        pageNumber: page.pageNumber,
        metadata: {
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex,
          financialKeywords: finMeta.keywords,
          numericValues: finMeta.numericValues
        }
      });
      globalChunkIndex++;
    }
  }

  return chunks;
}
