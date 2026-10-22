import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

/**
 * Validated JWT Secret Retrieval
 * Enforces production security standards and prevents fallback to weak dictionary keys.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[CRITICAL_SECURITY_ERROR] JWT_SECRET must be configured in production environment with minimum 32 characters entropy.');
    }
    // Controlled development fallback
    return 'church_platform_dev_insecure_jwt_secret_for_local_tests_only';
  }

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('[CRITICAL_SECURITY_ERROR] JWT_SECRET must be at least 32 characters in production.');
  }

  return secret;
}

export function getJwtRefreshSecret(): string {
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!refreshSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[CRITICAL_SECURITY_ERROR] JWT_REFRESH_SECRET must be configured in production environment.');
    }
    return 'church_platform_dev_insecure_refresh_secret_for_local_tests_only';
  }
  return refreshSecret;
}

/**
 * Centralized, safe extraction of optional authenticated user from Bearer header
 */
export function getOptionalAuthUser(req: Request): any | null {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

/**
 * Data Redactor for Sensitive Information (National IDs, passwords, tokens)
 */
export function redactSensitiveData(input: string): string {
  if (!input || typeof input !== 'string') return input;

  return input
    // Redact 14-digit Egyptian National IDs
    .replace(/\b([123]\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{7})\b/g, (_m, id) => id.slice(0, 4) + '******' + id.slice(10))
    // Redact Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
    // Redact passwords in JSON strings
    .replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[REDACTED_PASSWORD]"')
    // Redact API keys (e.g. gsk_..., AIzaSy...)
    .replace(/\b(gsk_[A-Za-z0-9]{20,}|AIzaSy[A-Za-z0-9\-_]{25,}|sk-[A-Za-z0-9]{20,})\b/g, '[REDACTED_API_KEY]');
}

/**
 * In-Memory Sliding-Window Rate Limiter
 * Tracks attempts by key (IP or Email + Action)
 */
interface RateLimitBucket {
  count: number;
  firstRequest: number;
  blockedUntil?: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
}

export function enforceRateLimit(
  key: string,
  options: RateLimitOptions
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  // Check if currently locked out
  if (bucket && bucket.blockedUntil && now < bucket.blockedUntil) {
    const retryAfterSeconds = Math.ceil((bucket.blockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // First request or window expired
  if (!bucket || now - bucket.firstRequest > options.windowMs) {
    rateLimitBuckets.set(key, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  // Within window
  bucket.count += 1;
  if (bucket.count > options.limit) {
    const blockDuration = options.blockDurationMs || options.windowMs;
    bucket.blockedUntil = now + blockDuration;
    const retryAfterSeconds = Math.ceil(blockDuration / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

/**
 * OTP Attempt Tracker (Protects 6-digit codes against brute-force)
 */
const otpAttemptsMap = new Map<string, number>();

export function recordOtpFailure(email: string): number {
  const current = (otpAttemptsMap.get(email.toLowerCase()) || 0) + 1;
  otpAttemptsMap.set(email.toLowerCase(), current);
  return current;
}

export function resetOtpAttempts(email: string): void {
  otpAttemptsMap.delete(email.toLowerCase());
}

export function getOtpFailures(email: string): number {
  return otpAttemptsMap.get(email.toLowerCase()) || 0;
}
