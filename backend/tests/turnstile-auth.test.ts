import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstileToken } from '../src/middleware/turnstile';

describe('Monerva Cloudflare Turnstile Verification Engine Suite', () => {

  it('1. MISSING TOKEN: Rejects null, undefined, or empty turnstile tokens', async () => {
    const resNull = await verifyTurnstileToken(null);
    assert.equal(resNull.success, false);
    assert.ok(resNull.error?.includes('required'));

    const resEmpty = await verifyTurnstileToken('   ');
    assert.equal(resEmpty.success, false);
    assert.ok(resEmpty.error?.includes('required'));
  });

  it('2. INVALID TOKEN: Detects and rejects invalid turnstile tokens', async () => {
    const resInvalid = await verifyTurnstileToken('test-invalid-token');
    assert.equal(resInvalid.success, false);
    assert.ok(resInvalid.error?.includes('Invalid token'));
    assert.deepEqual(resInvalid.errorCodes, ['invalid-input-response']);
  });

  it('3. EXPIRED OR DUPLICATE TOKEN: Rejects already spent or expired turnstile tokens', async () => {
    const resExpired = await verifyTurnstileToken('test-expired-token');
    assert.equal(resExpired.success, false);
    assert.ok(resExpired.error?.includes('expired or already used'));
    assert.deepEqual(resExpired.errorCodes, ['timeout-or-duplicate']);
  });

  it('4. SUCCESSFUL VERIFICATION: Accepts valid turnstile tokens', async () => {
    const resValid = await verifyTurnstileToken('test-valid-token');
    assert.equal(resValid.success, true);
    assert.equal(resValid.error, undefined);
  });

  it('5. PRODUCTION MISSING CONFIGURATION: Fails safely in production when TURNSTILE_SECRET_KEY is missing', async () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.TURNSTILE_SECRET_KEY;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.TURNSTILE_SECRET_KEY;

      const res = await verifyTurnstileToken('some-real-token');
      assert.equal(res.success, false);
      assert.ok(res.error?.includes('unavailable'));
      // Ensure secrets are never exposed in error text
      assert.ok(!res.error?.includes('0x4AAAAAA'));
    } finally {
      process.env.NODE_ENV = origEnv;
      if (origSecret) process.env.TURNSTILE_SECRET_KEY = origSecret;
    }
  });

  it('6. CLOUDFLARE TEST KEY COMPATIBILITY: Standard Cloudflare test site/secret key 1x00000000000000000000AA is supported', async () => {
    const resTestKey = await verifyTurnstileToken('1x00000000000000000000AA');
    assert.equal(resTestKey.success, true);
  });
});
