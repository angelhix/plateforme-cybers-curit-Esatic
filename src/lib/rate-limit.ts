import 'server-only';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { prisma } from './prisma';
import {
  applyRateLimits,
  clientIpFromVercelHeaders,
  createPostgresRateLimitStore,
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  type RateLimitPolicy,
  type RateLimitRequest,
} from './rate-limit-core';

const DEVELOPMENT_SECRET = 'local-only-rate-limit-secret-do-not-deploy';
export { RateLimitUnavailableError } from './rate-limit-core';

function getRateLimitSecret() {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') return DEVELOPMENT_SECRET;
  throw new RateLimitUnavailableError();
}

function digest(value: string) {
  return crypto.createHmac('sha256', getRateLimitSecret()).update(value).digest('hex');
}

export function rateLimitKey(scope: string, identity: string) {
  return digest(`${scope}:${identity}`);
}

async function getSourceIdentity() {
  if (process.env.NODE_ENV !== 'production') return 'development-local';
  const ip = clientIpFromVercelHeaders(await headers());
  if (!ip) throw new RateLimitUnavailableError();
  return ip;
}

export const postgresRateLimitStore = createPostgresRateLimitStore(async (key, policy) => prisma.$queryRaw<Array<{ count: number; blocked_until: Date | null; checked_at: Date }>>`
        INSERT INTO "rate_limit_buckets" ("key", "count", "window_started_at", "blocked_until", "updated_at")
        VALUES (${key}, 1, statement_timestamp(), NULL, statement_timestamp())
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE
            WHEN "rate_limit_buckets"."window_started_at" <= statement_timestamp() - (${policy.windowMs} * INTERVAL '1 millisecond') THEN 1
            ELSE "rate_limit_buckets"."count" + 1
          END,
          "window_started_at" = CASE
            WHEN "rate_limit_buckets"."window_started_at" <= statement_timestamp() - (${policy.windowMs} * INTERVAL '1 millisecond') THEN statement_timestamp()
            ELSE "rate_limit_buckets"."window_started_at"
          END,
          "blocked_until" = CASE
            WHEN "rate_limit_buckets"."window_started_at" <= statement_timestamp() - (${policy.windowMs} * INTERVAL '1 millisecond') THEN NULL
            WHEN "rate_limit_buckets"."blocked_until" > statement_timestamp() THEN "rate_limit_buckets"."blocked_until"
            WHEN "rate_limit_buckets"."count" + 1 > ${policy.limit} THEN statement_timestamp() + (
              CASE
                WHEN ${policy.progressiveBackoff !== undefined} THEN LEAST(
                  ${policy.progressiveBackoff?.maxDelayMs ?? 0},
                  ${policy.progressiveBackoff?.baseDelayMs ?? 0} * POWER(2.0, LEAST(GREATEST("rate_limit_buckets"."count" + 1 - ${policy.limit} - 1, 0), 10))
                )
                ELSE ${policy.windowMs}
              END * INTERVAL '1 millisecond'
            )
            ELSE NULL
          END,
          "updated_at" = statement_timestamp()
        RETURNING "count", "blocked_until", statement_timestamp() AS "checked_at"
      `);

async function apply(requests: RateLimitRequest[]) {
  return applyRateLimits(postgresRateLimitStore, requests);
}

export async function consumeLoginLimits(handle: string) {
  const source = await getSourceIdentity();
  return apply([
    { key: rateLimitKey('login-source', source), policy: RATE_LIMIT_POLICIES.loginSource },
    { key: rateLimitKey('login-account', handle), policy: RATE_LIMIT_POLICIES.loginAccount },
  ]);
}

export async function resetLoginAccountLimit(handle: string) {
  try {
    await prisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "key" = ${rateLimitKey('login-account', handle)}`;
  } catch {
    throw new RateLimitUnavailableError();
  }
}

export async function consumeRegistrationLimits() {
  const source = await getSourceIdentity();
  return apply([
    { key: rateLimitKey('registration-source', source), policy: RATE_LIMIT_POLICIES.registrationSource },
    { key: rateLimitKey('registration-global', 'all'), policy: RATE_LIMIT_POLICIES.registrationGlobal },
  ]);
}

export async function consumeFlagLimits(userId: number, challengeId: string) {
  const source = await getSourceIdentity();
  return apply([
    { key: rateLimitKey('flag-source', source), policy: RATE_LIMIT_POLICIES.flagSource },
    { key: rateLimitKey('flag-user', String(userId)), policy: RATE_LIMIT_POLICIES.flagUser },
    { key: rateLimitKey('flag-challenge', challengeId), policy: RATE_LIMIT_POLICIES.flagChallenge },
  ]);
}