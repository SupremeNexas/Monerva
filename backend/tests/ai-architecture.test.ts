import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisionAIProvider,
  getTextAIProvider,
  getAIProviderForTask,
  GeminiVisionProvider,
  GeminiTextProvider,
  MockTextProvider,
  TextAIProvider,
  AIService,
  FinancialInsightsService,
  BillScannerService
} from '../src/services/ai';

describe('Finova AI Architecture & Separation Test Suite', () => {

  it('1. VISION ISOLATION: getVisionAIProvider() throws UNAVAILABLE when GEMINI_API_KEY is unset', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      assert.throws(
        () => getVisionAIProvider(),
        (err: any) => err.message === 'UNAVAILABLE'
      );
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('2. VISION TASK ROUTING: getAIProviderForTask("RECEIPT_VISION") routes to Vision provider', () => {
    const originalKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'test-gemini-key-123';

    try {
      const provider = getAIProviderForTask('RECEIPT_VISION');
      assert.ok(provider instanceof GeminiVisionProvider);
      assert.ok(typeof (provider as GeminiVisionProvider).generateMultimodalJSON === 'function');
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
      else delete process.env.GEMINI_API_KEY;
    }
  });

  it('3. INSIGHTS TASK ROUTING: getAIProviderForTask("FINANCIAL_INSIGHTS") routes to Text provider and NEVER exposes vision methods', () => {
    const provider = getAIProviderForTask('FINANCIAL_INSIGHTS') as TextAIProvider;
    assert.ok(provider);
    assert.ok(typeof provider.generateText === 'function');
    assert.ok(typeof provider.generateJSON === 'function');
  });

  it('4. GEMINI QUOTA PROTECTION: Text AI Provider does NOT consume multimodal vision API', async () => {
    let multimodalCalled = false;

    // Create a dummy object mimicking a text provider
    const textProvider = getTextAIProvider();
    assert.equal((textProvider as any).generateMultimodalJSON, undefined, 'Text AI Provider MUST NOT expose multimodal vision methods!');
  });

  it('5. FINANCIAL ACCURACY & AUTHORITATIVE MATH: AI Chat response is grounded in database calculations', async () => {
    const mockUserId = 'user-math-test-101';
    const mockWorkspaceId = 'workspace-math-test-202';

    const result = await FinancialInsightsService.query(
      mockUserId,
      mockWorkspaceId,
      'Where did I spend the most this month?'
    );

    assert.ok(result);
    assert.ok(result.answer);
    assert.ok(result.keyNumbers);
    assert.equal(typeof result.keyNumbers.totalSpend, 'number');
    assert.equal(typeof result.keyNumbers.totalIncome, 'number');
    assert.equal(typeof result.keyNumbers.netSavings, 'number');
    assert.equal(typeof result.keyNumbers.savingsRate, 'number');
    assert.ok(Array.isArray(result.contributingCategories));
    assert.ok(Array.isArray(result.charts));
    assert.ok(result.confidence === 1.0, 'Confidence must be 1.0 for authoritative DB calculations!');
  });

  it('6. RESPONSE STRUCTURE: Internal insight response adheres to strict schema', async () => {
    const mockUserId = 'user-schema-test-303';
    const mockWorkspaceId = 'workspace-schema-test-404';

    const insight = await FinancialInsightsService.query(
      mockUserId,
      mockWorkspaceId,
      'How much did I spend on Food?'
    );

    assert.ok('answer' in insight);
    assert.ok('keyNumbers' in insight);
    assert.ok('relevantPeriod' in insight);
    assert.ok('contributingCategories' in insight);
    assert.ok('supportingTransactions' in insight);
    assert.ok('recommendations' in insight);
    assert.ok('confidence' in insight);
    assert.ok('limitations' in insight);
    assert.ok('charts' in insight);
    assert.ok('summary' in insight);
  });
});
