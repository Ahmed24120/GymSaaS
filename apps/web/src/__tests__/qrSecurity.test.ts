import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';

beforeAll(() => {
  // Ensure test secret is set
  process.env.QR_SIGNING_SECRET = randomBytes(32).toString('base64');
});

import { generateSignedQR, verifySignedQR } from '../lib/services/qrSecurity';

describe('Cryptographic HMAC-SHA256 QR Security', () => {
  const gymId = 'a0000000-0000-0000-0000-000000000001';
  const memberId = 'b0000000-0000-0000-0000-000000000001';

  it('generates a signed token with 30s expiration and nonce', () => {
    const signed = generateSignedQR(gymId, memberId);

    expect(signed.token).toBeDefined();
    expect(signed.expires_in_seconds).toBe(30);
    expect(signed.payload.gym_id).toBe(gymId);
    expect(signed.payload.member_id).toBe(memberId);
    expect(signed.payload.nonce).toBeDefined();
    expect(signed.signature).toHaveLength(64); // SHA-256 hex
  });

  it('verifies a freshly generated token as valid', () => {
    const signed = generateSignedQR(gymId, memberId);
    const result = verifySignedQR(signed.token, 30);

    expect(result.valid).toBe(true);
    expect(result.payload?.gym_id).toBe(gymId);
    expect(result.payload?.member_id).toBe(memberId);
    expect(result.payload?.nonce).toBe(signed.payload.nonce);
  });

  it('rejects a tampered signature with INVALID_SIGNATURE', () => {
    const signed = generateSignedQR(gymId, memberId);
    // Decode, alter member_id, re-encode without updating signature
    const decoded = JSON.parse(Buffer.from(signed.token, 'base64url').toString('utf-8'));
    decoded.member_id = 'b0000000-0000-0000-0000-999999999999';
    const tamperedToken = Buffer.from(JSON.stringify(decoded)).toString('base64url');

    const result = verifySignedQR(tamperedToken, 30);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_SIGNATURE');
  });

  it('rejects an expired token (> 30 seconds) with EXPIRED', () => {
    // Generate token with timestamp 40 seconds in the past
    const secret = process.env.QR_SIGNING_SECRET!;
    const crypto = require('crypto');
    const oldTimestamp = Math.floor(Date.now() / 1000) - 40;
    const nonce = crypto.randomUUID();
    const dataToSign = `${gymId}:${memberId}:${oldTimestamp}:${nonce}`;
    const sig = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

    const expiredToken = Buffer.from(
      JSON.stringify({ gym_id: gymId, member_id: memberId, timestamp: oldTimestamp, nonce, sig })
    ).toString('base64url');

    const result = verifySignedQR(expiredToken, 30);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('EXPIRED');
  });

  it('rejects a future timestamp (> 5 seconds ahead) with FUTURE_TIMESTAMP', () => {
    const secret = process.env.QR_SIGNING_SECRET!;
    const crypto = require('crypto');
    const futureTimestamp = Math.floor(Date.now() / 1000) + 60;
    const nonce = crypto.randomUUID();
    const dataToSign = `${gymId}:${memberId}:${futureTimestamp}:${nonce}`;
    const sig = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

    const futureToken = Buffer.from(
      JSON.stringify({ gym_id: gymId, member_id: memberId, timestamp: futureTimestamp, nonce, sig })
    ).toString('base64url');

    const result = verifySignedQR(futureToken, 30);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('FUTURE_TIMESTAMP');
  });

  it('rejects completely malformed tokens with MALFORMED', () => {
    expect(verifySignedQR('not-a-valid-token').valid).toBe(false);
    expect(verifySignedQR('').valid).toBe(false);
  });
});
