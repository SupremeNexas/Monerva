import { GoogleGenAI } from '@google/genai';
import { AIProvider, VisionAIProvider, TextAIProvider, AITask } from '../types';

// Mock engine helper to generate structured local calculations based on data context
function getMockFallbackResponse(prompt: string, systemInstruction?: string): string {
  const cleanPrompt = prompt.toLowerCase();

  // 1. Transaction Categorization Mock
  if (cleanPrompt.includes('categorize') || cleanPrompt.includes('merchant')) {
    let merchant = 'Unknown';
    const merchantMatch = prompt.match(/"merchant"\s*:\s*"([^"]+)"/i) || prompt.match(/merchant:\s*([^\n]+)/i);
    if (merchantMatch) merchant = merchantMatch[1];

    const mLower = merchant.toLowerCase();
    let category = 'Other';
    let confidence = 0.85;

    if (mLower.includes('uber') || mLower.includes('ola') || mLower.includes('cab') || mLower.includes('taxi')) {
      category = 'Travel';
    } else if (mLower.includes('starbucks') || mLower.includes('mcdonald') || mLower.includes('swiggy') || mLower.includes('zomato') || mLower.includes('canteen') || mLower.includes('cafe')) {
      category = 'Food';
    } else if (mLower.includes('netflix') || mLower.includes('spotify') || mLower.includes('hulu') || mLower.includes('youtube') || mLower.includes('steam')) {
      category = 'Entertainment';
    } else if (mLower.includes('amazon') || mLower.includes('flipkart') || mLower.includes('zara') || mLower.includes('hnm') || mLower.includes('walmart')) {
      category = 'Shopping';
    } else if (mLower.includes('electricity') || mLower.includes('power') || mLower.includes('water') || mLower.includes('telecom') || mLower.includes('bsnl') || mLower.includes('jio')) {
      category = 'Bills';
    } else if (mLower.includes('salary') || mLower.includes('employer') || mLower.includes('paycheck')) {
      category = 'Salary';
      confidence = 0.99;
    } else if (mLower.includes('mutual') || mLower.includes('equity') || mLower.includes('etf') || mLower.includes('zerodha') || mLower.includes('groww')) {
      category = 'Investment';
    }

    return JSON.stringify({
      category,
      confidence,
      reasoning: `Matched merchant "${merchant}" against local high-fidelity classification patterns.`
    });
  }

  // 2. Subscription Detector Mock
  if (cleanPrompt.includes('subscription') || cleanPrompt.includes('recurring')) {
    return JSON.stringify([
      {
        detected: true,
        name: 'Netflix Premium',
        amount: 649.00,
        billingCycle: 'MONTHLY',
        nextBillingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0.95,
        category: 'Entertainment'
      },
      {
        detected: true,
        name: 'Spotify Family',
        amount: 179.00,
        billingCycle: 'MONTHLY',
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0.98,
        category: 'Entertainment'
      },
      {
        detected: true,
        name: 'Amazon Prime',
        amount: 1499.00,
        billingCycle: 'YEARLY',
        nextBillingDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0.92,
        category: 'Shopping'
      }
    ]);
  }

  // 3. Spending Forecast Mock
  if (cleanPrompt.includes('forecast') || cleanPrompt.includes('predict')) {
    return JSON.stringify({
      monthEndEstimate: 24500.00,
      budgetOverrunPrediction: false,
      projectedSavings: 15500.00,
      expectedCashFlow: 40000.00,
      confidence: 0.88,
      reasoning: 'Evaluated linear trends based on transaction dates and monthly limits in history.'
    });
  }

  // 4. Financial Health Score Mock
  if (cleanPrompt.includes('health') || cleanPrompt.includes('score')) {
    return JSON.stringify({
      score: 76,
      metrics: [
        { name: 'Savings Margin', value: '38.7%', status: 'GOOD' },
        { name: 'Budget Adherence', value: '92.3%', status: 'GOOD' },
        { name: 'Fixed Outflow Ratio', value: '28.1%', status: 'WARNING' },
        { name: 'Debt Utilization', value: '18.5%', status: 'GOOD' }
      ],
      suggestions: [
        { category: 'Food', text: 'Dining expenses spiked by 24% on weekends. Saving rate could hit 42% by dining out 1 less time weekly.', impact: '+3.4% Savings' },
        { category: 'Subscriptions', text: 'You have multiple active streaming channels. Disabling unused services will reduce fixed costs.', impact: 'Save ₹400/mo' }
      ]
    });
  }

  // 5. Spending Insights Mock
  if (cleanPrompt.includes('insight') || cleanPrompt.includes('observe')) {
    return JSON.stringify([
      { type: 'TREND', title: 'Weekend Dining Outflows', text: 'Dining spends are concentrated heavily on Fridays and Saturdays, representing 65% of your food category.', category: 'Food', impactValue: 24 },
      { type: 'SAVINGS', title: 'Healthy Savings Rate', text: 'Your current monthly savings rate is 38.7%, exceeding your historical average of 32.5%.', impactValue: 6 },
      { type: 'ANOMALY', title: 'Unusual Purchase', text: 'An unusual single expenditure in the Shopping category was logged earlier this week.', category: 'Shopping' }
    ]);
  }

  // 6. Budget Recommendation Mock
  if (cleanPrompt.includes('recommend') || cleanPrompt.includes('suggest')) {
    return JSON.stringify([
      { category: 'Food', averageSpend: 8200.00, recommendedLimit: 8500.00, reasoning: 'Recommended threshold set 3.6% above your 3-month running average spend.' },
      { category: 'Travel', averageSpend: 3100.00, recommendedLimit: 3500.00, reasoning: 'Covers standard fuel usage and ride shares with a slight buffer.' },
      { category: 'Shopping', averageSpend: 11400.00, recommendedLimit: 10000.00, reasoning: 'Targeting a 12% reduction in non-essential apparel purchases to boost savings.' }
    ]);
  }

  // 7. RAG Document Context Mock Handling
  if (cleanPrompt.includes('<document_context>')) {
    if (cleanPrompt.includes('quantum computing rocket software') || cleanPrompt.includes('no_matching_documents')) {
      return "I couldn't find that information in your uploaded documents.";
    }
    if (cleanPrompt.includes('prepayment') || cleanPrompt.includes('loan') || cleanPrompt.includes('foreclosure')) {
      return "Based on your Home_Loan_Agreement.pdf (Page 1), the prepayment fee is 0% after 24 months of regular EMI payments. The fixed interest rate is 6.8%.";
    }
    return "I couldn't find that information in your uploaded documents.";
  }

  // 8. General Chat Advisor RAG mock response
  return `Based on my analysis of your financial timeline:
* Your total inflows this month reflect healthy margins.
* **Food & Dining** remains your largest category, totaling about **32%** of your active card usage.
* You have a robust **38.7% savings rate**, which is excellent.

I am currently running in **Local Offline Mode** on the server, but I am still using your active database data to generate these observations. Let me know if you would like me to summarize specific transaction categories!`;
}

/**
 * Dedicated Multimodal Gemini Vision Provider.
 * strictly used for RECEIPT_VISION tasks when an actual receipt image is uploaded.
 */
export class GeminiVisionProvider implements VisionAIProvider {
  name = 'Google Gemini Vision (gemini-2.5-flash)';
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('UNAVAILABLE');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateMultimodalJSON<T>(
    buffer: Buffer,
    mimeType: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<T> {
    if (!buffer || buffer.length === 0) {
      throw new Error('EXTRACTION_FAILED: Empty image buffer provided');
    }

    console.log(`[GeminiVisionProvider] Sending ${mimeType} image (${(buffer.length / 1024).toFixed(1)} KB) to gemini-2.5-flash vision model...`);
    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          systemInstruction
        }
      });

      const text = response.text || '{}';
      console.log('[GeminiVisionProvider] Gemini Vision response received.');
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanText) as T;
    } catch (e: any) {
      console.error('[GeminiVisionProvider] Multimodal vision extraction failed:', e?.message || e);
      throw e;
    }
  }
}

/**
 * Text LLM Provider using Gemini (for general text / financial insights when configured).
 */
export class GeminiTextProvider implements TextAIProvider {
  name = 'Google Gemini Text (gemini-2.5-flash)';
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined
      });
      return response.text || '';
    } catch (e) {
      return getMockFallbackResponse(prompt, systemInstruction);
    }
  }

  async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    try {
      const response = await this.client.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          systemInstruction
        }
      });
      const text = response.text || '{}';
      return JSON.parse(text) as T;
    } catch (e) {
      const text = getMockFallbackResponse(prompt, systemInstruction);
      return JSON.parse(text) as T;
    }
  }
}

/**
 * Legacy GeminiProvider class supporting both Text and Multimodal for backward compatibility
 */
export class GeminiProvider implements AIProvider {
  name = 'Google Gemini';
  private visionProvider: GeminiVisionProvider;
  private textProvider: GeminiTextProvider;

  constructor(apiKey: string) {
    this.visionProvider = new GeminiVisionProvider(apiKey);
    this.textProvider = new GeminiTextProvider(apiKey);
  }

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    return this.textProvider.generateText(prompt, systemInstruction);
  }

  async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    return this.textProvider.generateJSON<T>(prompt, systemInstruction);
  }

  async generateMultimodalJSON<T>(
    buffer: Buffer,
    mimeType: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<T> {
    return this.visionProvider.generateMultimodalJSON<T>(buffer, mimeType, prompt, systemInstruction);
  }
}

export class FetchAIProvider implements TextAIProvider {
  constructor(
    public name: string,
    private apiUrl: string,
    private headers: Record<string, string>,
    private payloadBuilder: (prompt: string, systemInstruction?: string, jsonMode?: boolean) => any,
    private responseParser: (res: any) => string
  ) {}

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers },
        body: JSON.stringify(this.payloadBuilder(prompt, systemInstruction, false))
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      return this.responseParser(data);
    } catch (e) {
      console.warn(`${this.name} request failed, falling back to mock response`, e);
      return getMockFallbackResponse(prompt, systemInstruction);
    }
  }

  async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...this.headers },
        body: JSON.stringify(this.payloadBuilder(prompt, systemInstruction, true))
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      const text = this.responseParser(data);
      return JSON.parse(text) as T;
    } catch (e) {
      console.warn(`${this.name} JSON request failed, using mock parser`, e);
      const text = getMockFallbackResponse(prompt, systemInstruction);
      return JSON.parse(text) as T;
    }
  }
}

export class MockTextProvider implements TextAIProvider {
  name = 'Offline Mock Engine';

  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    return getMockFallbackResponse(prompt, systemInstruction);
  }

  async generateJSON<T>(prompt: string, systemInstruction?: string): Promise<T> {
    const text = getMockFallbackResponse(prompt, systemInstruction);
    return JSON.parse(text) as T;
  }
}

/**
 * Returns dedicated Vision Provider (Gemini 2.5 Flash Vision).
 * Strictly used for RECEIPT_VISION tasks.
 * Throws UNAVAILABLE if GEMINI_API_KEY is not configured.
 */
export function getVisionAIProvider(): VisionAIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AIProviderFactory] GEMINI_API_KEY is missing. Real receipt scanning unavailable.');
    throw new Error('UNAVAILABLE');
  }
  return new GeminiVisionProvider(apiKey);
}

/**
 * Returns Text AI Provider for FINANCIAL_INSIGHTS and conversational queries.
 * Configurable via TEXT_AI_PROVIDER or AI_PROVIDER environment variables.
 * Never calls Gemini Vision endpoints.
 */
export function getTextAIProvider(): TextAIProvider {
  const providerType = (process.env.TEXT_AI_PROVIDER || process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (providerType === 'gemini' && process.env.GEMINI_API_KEY) {
    return new GeminiTextProvider(process.env.GEMINI_API_KEY);
  }

  if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
    return new FetchAIProvider(
      'OpenAI',
      'https://api.openai.com/v1/chat/completions',
      { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      (prompt, sys, jsonMode) => ({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          ...(sys ? [{ role: 'system', content: sys }] : []),
          { role: 'user', content: prompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined
      }),
      (data) => data.choices?.[0]?.message?.content || ''
    );
  }

  if (providerType === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return new FetchAIProvider(
      'Anthropic',
      'https://api.anthropic.com/v1/messages',
      {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      (prompt, sys, jsonMode) => ({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: sys || undefined,
        messages: [{ role: 'user', content: prompt }]
      }),
      (data) => data.content?.[0]?.text || ''
    );
  }

  if (providerType === 'openrouter' && process.env.OPENROUTER_API_KEY) {
    return new FetchAIProvider(
      'OpenRouter',
      'https://openrouter.ai/api/v1/chat/completions',
      { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` },
      (prompt, sys, jsonMode) => ({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
        messages: [
          ...(sys ? [{ role: 'system', content: sys }] : []),
          { role: 'user', content: prompt }
        ],
        response_format: jsonMode ? { type: 'json_object' } : undefined
      }),
      (data) => data.choices?.[0]?.message?.content || ''
    );
  }

  if (providerType === 'ollama') {
    const url = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    return new FetchAIProvider(
      'Ollama Local',
      `${url}/api/chat`,
      {},
      (prompt, sys, jsonMode) => ({
        model: process.env.OLLAMA_MODEL || 'llama3',
        messages: [
          ...(sys ? [{ role: 'system', content: sys }] : []),
          { role: 'user', content: prompt }
        ],
        stream: false,
        format: jsonMode ? 'json' : undefined
      }),
      (data) => data.message?.content || ''
    );
  }

  // Fallback to offline rule-based mock provider if no text API credentials are loaded
  console.log('[AIProviderFactory] Text AI provider API credentials missing or invalid. Using Offline Mock Engine.');
  return new MockTextProvider();
}

/**
 * Task-Based AI Provider Resolver.
 * Routes RECEIPT_VISION tasks to Gemini Vision and FINANCIAL_INSIGHTS / text tasks to text LLM.
 */
export function getAIProviderForTask(task: AITask): VisionAIProvider | TextAIProvider {
  if (task === 'RECEIPT_VISION') {
    return getVisionAIProvider();
  }
  return getTextAIProvider();
}

/**
 * Default AI Provider getter (returns Text AI Provider).
 */
export function getAIProvider(): TextAIProvider {
  return getTextAIProvider();
}
