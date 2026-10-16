import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type { RateLimitPolicy } from './rate-limit-core';

const testDatabaseUrl = process.env.RATE_LIMIT_TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;

function isDedicatedTestDatabase(candidate?: string, application?: string) {
  if (!candidate) return false;
  try {
    const candidateUrl = new URL(candidate);
    const databaseName = decodeURIComponent(candidateUrl.pathname.slice(1));
    if (!/(^|[_-])test([_-]|$)/i.test(databaseName)) return false;
    if (!application) return true;
    const applicationUrl = new URL(application);
    return `${candidateUrl.origin}${candidateUrl.pathname}` !== `${applicationUrl.origin}${applicationUrl.pathname}`;
  } catch {
    return false;
  }
}

const dedicatedTestDatabase = isDedicatedTestDatabase(testDatabaseUrl, applicationDatabaseUrl);

test('PostgreSQL upsert enforces a shared concurrent threshold', { skip: !dedicatedTestDatabase }, async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousRateLimitSecret = process.env.RATE_LIMIT_SECRET;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.RATE_LIMIT_SECRET = crypto.randomBytes(32).toString('hex');

  const { prisma } = await import('./prisma-client');
  const { postgresRateLimitStore } = await import('./rate-limit');
  const namespace = `security-test-${crypto.randomUUID()}-`;
  const key = `${namespace}shared-bucket`;
  const policy: RateLimitPolicy = { limit: 8, windowMs: 60_000 };

  try {
    const results = await Promise.all(Array.from({ length: 40 }, () => postgresRateLimitStore.consume(key, policy)));
    assert.equal(results.filter(result => result.allowed).length, policy.limit);
    assert.equal(results.filter(result => !result.allowed).length, 40 - policy.limit);
  } finally {
    await prisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "key" LIKE ${`${namespace}%`}`;
    await prisma.$disconnect();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousRateLimitSecret === undefined) delete process.env.RATE_LIMIT_SECRET;
    else process.env.RATE_LIMIT_SECRET = previousRateLimitSecret;
  }
});