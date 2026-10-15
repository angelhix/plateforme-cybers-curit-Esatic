import crypto from 'node:crypto';
import { isIP } from 'node:net';

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
  progressiveBackoff?: { baseDelayMs: number; maxDelayMs: number };
};

export const RATE_LIMIT_POLICIES = {
  loginAccount: { limit: 5, windowMs: 15 * 60_000, progressiveBackoff: { baseDelayMs: 1_000, maxDelayMs: 15 * 60_000 } },
  loginSource: { limit: 300, windowMs: 15 * 60_000, progressiveBackoff: { baseDelayMs: 1_000, maxDelayMs: 15 * 60_000 } },
  registrationSource: { limit: 20, windowMs: 60 * 60_000 },
  registrationGlobal: { limit: 500, windowMs: 60 * 60_000 },
  flagUser: { limit: 10, windowMs: 60_000 },
  flagSource: { limit: 60, windowMs: 60_000 },
  flagChallenge: { limit: 600, windowMs: 60_000 },
} satisfies Record<string, RateLimitPolicy>;

export type RateLimitRequest = {
  key: string;
  policy: RateLimitPolicy;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs: number;
};

export interface AtomicRateLimitStore {
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
}

export function verifyTrustedClientIp(ip: string | null, signature: string | null, secret: string) {
  if (!ip || !signature || !isIP(ip) || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  const expected = crypto.createHmac('sha256', secret).update(ip).digest();
  const received = Buffer.from(signature, 'hex');
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  return networkIdentity(ip);
}

function networkIdentity(ip: string) {
  if (isIP(ip) === 4) return ip;

  const address = ip.toLowerCase().split('%')[0];
  const [left, right = ''] = address.split('::');
  const parseGroups = (part: string) => part ? part.split(':') : [];
  const leftGroups = parseGroups(left);
  let rightGroups = parseGroups(right);
  if (rightGroups.length && rightGroups[rightGroups.length - 1].includes('.')) {
    const octets = rightGroups.pop()!.split('.').map(Number);
    rightGroups.push(((octets[0] << 8) | octets[1]).toString(16), ((octets[2] << 8) | octets[3]).toString(16));
  }
  const groups = address.includes('::')
    ? [...leftGroups, ...Array(8 - leftGroups.length - rightGroups.length).fill('0'), ...rightGroups]
    : leftGroups;
  const normalized = groups.map(group => parseInt(group || '0', 16).toString(16));
  if (normalized.slice(0, 5).every(group => group === '0') && normalized[5] === 'ffff') {
    const first = parseInt(normalized[6], 16);
    const second = parseInt(normalized[7], 16);
    return `${first >> 8}.${first & 255}.${second >> 8}.${second & 255}`;
  }
  return `${normalized.slice(0, 4).join(':')}::/64`;
}

export async function applyRateLimits(
  store: AtomicRateLimitStore,
  requests: RateLimitRequest[],
): Promise<RateLimitResult> {
  let retryAfterMs = 0;
  for (const { key, policy } of requests) {
    const result = await store.consume(key, policy);
    retryAfterMs = Math.max(retryAfterMs, result.retryAfterMs);
    if (!result.allowed) return { allowed: false, retryAfterMs };
  }
  return { allowed: true, retryAfterMs };
}