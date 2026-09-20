import crypto from 'crypto';
import { ActionItem } from './analyzeTranscript';

export interface PendingApproval {
  token: string;
  email: string;
  actionItems: ActionItem[];
  createdAt: number;
}

interface SignedTokenPayload {
  email: string;
  actionItems: ActionItem[];
  createdAt: number;
  expiresAt: number;
}

/**
 * Retrieves the signing secret for HMAC generation and verification.
 * Uses APPROVAL_TOKEN_SECRET environment variable.
 */
function getSigningSecret(): string {
  return process.env.APPROVAL_TOKEN_SECRET || 'fallback_dev_approval_token_secret_2026';
}

// Default token TTL: 7 days (in milliseconds)
const TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates a stateless, URL-safe HMAC-signed approval token containing the pending action items payload.
 */
export function createPendingApproval(email: string, actionItems: ActionItem[]): string {
  const createdAt = Date.now();
  const expiresAt = createdAt + TOKEN_EXPIRATION_MS;

  const payload: SignedTokenPayload = {
    email: email.trim(),
    actionItems,
    createdAt,
    expiresAt
  };

  const payloadJson = JSON.stringify(payload);
  const encodedPayload = Buffer.from(payloadJson, 'utf8').toString('base64url');

  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the HMAC signature and expiration of a stateless approval token.
 * Returns the decoded PendingApproval object if valid, or undefined if invalid/expired.
 */
export function getPendingApproval(token: string): PendingApproval | undefined {
  if (!token || typeof token !== 'string') {
    return undefined;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return undefined;
  }

  const [encodedPayload, signature] = parts;

  if (!encodedPayload || !signature) {
    return undefined;
  }

  // 1. Verify HMAC signature using timingSafeEqual
  const expectedSignature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSignature, 'utf8');

  if (sigBuffer.length !== expectedSigBuffer.length) {
    return undefined;
  }

  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return undefined;
  }

  // 2. Decode payload & verify expiration
  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson) as SignedTokenPayload;

    if (!payload || !payload.email || !Array.isArray(payload.actionItems)) {
      return undefined;
    }

    if (typeof payload.expiresAt === 'number' && Date.now() > payload.expiresAt) {
      console.warn('Approval token has expired.');
      return undefined;
    }

    return {
      token,
      email: payload.email,
      actionItems: payload.actionItems,
      createdAt: payload.createdAt || Date.now()
    };
  } catch (err) {
    console.error('Failed to parse approval token payload:', err);
    return undefined;
  }
}

/**
 * Stateless cleanup helper. Returns true for valid tokens.
 */
export function removePendingApproval(token: string): boolean {
  if (!token) return false;
  return true;
}
