import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { applyRateLimits, RATE_LIMIT_POLICIES, verifyTrustedClientIp, type AtomicRateLimitStore, type RateLimitPolicy, type RateLimitResult } from './rate-limit-core';

class FakeAtomicStore implements AtomicRateLimitStore {
  private readonly buckets = new Map<string, { count: number; startedAt: number; blockedUntil: number }>();

  constructor(private now = 1_000_000) {}

  advance(milliseconds: number) {
    this.now += milliseconds;
  }

  async consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
    const current = this.buckets.get(key);
    const expired = !current || current.startedAt <= this.now - policy.windowMs;
    const bucket = expired
      ? { count: 1, startedAt: this.now, blockedUntil: 0 }
      : { ...current, count: current.count + 1 };

    if (bucket.count > policy.limit) {
      const backoff = policy.progressiveBackoff;
      const delay = backoff
        ? Math.min(backoff.maxDelayMs, backoff.baseDelayMs * 2 ** Math.min(bucket.count - policy.limit - 1, 10))
        : Math.max(1, bucket.startedAt + policy.windowMs - this.now);
      bucket.blockedUntil = Math.max(bucket.blockedUntil, this.now + delay);
    }

    this.buckets.set(key, bucket);
    const retryAfterMs = Math.max(0, bucket.blockedUntil - this.now);
    return { allowed: bucket.count <= policy.limit && retryAfterMs === 0, retryAfterMs };
  }
}

test('enforces the exact threshold and resets after the window', async () => {
  const store = new FakeAtomicStore();
  const policy = { limit: 2, windowMs: 1_000 };

  assert.equal((await applyRateLimits(store, [{ key: 'source', policy }])).allowed, true);
  assert.equal((await applyRateLimits(store, [{ key: 'source', policy }])).allowed, true);
  assert.equal((await applyRateLimits(store, [{ key: 'source', policy }])).allowed, false);
  store.advance(1_001);
  assert.equal((await applyRateLimits(store, [{ key: 'source', policy }])).allowed, true);
});

test('serializes concurrent requests so only the configured number pass', async () => {
  const store = new FakeAtomicStore();
  const policy = { limit: 7, windowMs: 60_000 };
  const results = await Promise.all(Array.from({ length: 40 }, () =>
    applyRateLimits(store, [{ key: 'shared-source', policy }]),
  ));

  assert.equal(results.filter(result => result.allowed).length, 7);
  assert.equal(results.filter(result => !result.allowed).length, 33);
});

test('a shared source limit applies across separate account keys', async () => {
  const store = new FakeAtomicStore();
  const accountPolicy = RATE_LIMIT_POLICIES.loginAccount;
  const sourcePolicy = { limit: 1, windowMs: 60_000 };
  const first = await applyRateLimits(store, [
    { key: 'source-x', policy: sourcePolicy },
    { key: 'account-a', policy: accountPolicy },
  ]);
  const second = await applyRateLimits(store, [
    { key: 'source-x', policy: sourcePolicy },
    { key: 'account-b', policy: accountPolicy },
  ]);

  assert.equal(first.allowed, true);
  assert.equal(second.allowed, false);
});

test('flag source quotas stop multiple accounts from multiplying attempts', async () => {
  const store = new FakeAtomicStore();
  const sourceKey = 'flag-source:school-nat';

  for (let userId = 1; userId <= RATE_LIMIT_POLICIES.flagSource.limit; userId++) {
    const result = await applyRateLimits(store, [
      { key: sourceKey, policy: RATE_LIMIT_POLICIES.flagSource },
      { key: `flag-user:${userId}`, policy: RATE_LIMIT_POLICIES.flagUser },
      { key: 'flag-challenge:one', policy: RATE_LIMIT_POLICIES.flagChallenge },
    ]);
    assert.equal(result.allowed, true);
  }

  const blockedAtSource = await applyRateLimits(store, [
    { key: sourceKey, policy: RATE_LIMIT_POLICIES.flagSource },
    { key: 'flag-user:61', policy: RATE_LIMIT_POLICIES.flagUser },
    { key: 'flag-challenge:one', policy: RATE_LIMIT_POLICIES.flagChallenge },
  ]);
  assert.equal(blockedAtSource.allowed, false);

  const sameAccountNewSource = await applyRateLimits(store, [
    { key: 'flag-source:other-network', policy: RATE_LIMIT_POLICIES.flagSource },
    { key: 'flag-user:61', policy: RATE_LIMIT_POLICIES.flagUser },
    { key: 'flag-challenge:one', policy: RATE_LIMIT_POLICIES.flagChallenge },
  ]);
  assert.equal(sameAccountNewSource.allowed, true);
});

test('production policies retain per-user limits and shared source/global limits', () => {
  assert.equal(RATE_LIMIT_POLICIES.loginAccount.limit, 5);
  assert.equal(RATE_LIMIT_POLICIES.loginSource.limit, 300);
  assert.equal(RATE_LIMIT_POLICIES.registrationSource.limit, 20);
  assert.equal(RATE_LIMIT_POLICIES.registrationGlobal.limit, 500);
  assert.equal(RATE_LIMIT_POLICIES.flagUser.limit, 10);
  assert.equal(RATE_LIMIT_POLICIES.flagSource.limit, 60);
  assert.equal(RATE_LIMIT_POLICIES.flagChallenge.limit, 600);
});

test('progressive cooldown increases and is capped', async () => {
  const store = new FakeAtomicStore();
  const policy = { limit: 1, windowMs: 60_000, progressiveBackoff: { baseDelayMs: 100, maxDelayMs: 250 } };
  await applyRateLimits(store, [{ key: 'account', policy }]);

  const firstBlocked = await applyRateLimits(store, [{ key: 'account', policy }]);
  assert.equal(firstBlocked.allowed, false);
  assert.equal(firstBlocked.retryAfterMs, 100);

  store.advance(101);
  const secondBlocked = await applyRateLimits(store, [{ key: 'account', policy }]);
  assert.equal(secondBlocked.retryAfterMs, 200);

  store.advance(201);
  const capped = await applyRateLimits(store, [{ key: 'account', policy }]);
  assert.equal(capped.retryAfterMs, 250);
});

test('fails closed when the shared store is unavailable', async () => {
  const unavailable: AtomicRateLimitStore = { consume: async () => { throw new Error('storage unavailable'); } };
  await assert.rejects(() => applyRateLimits(unavailable, [{ key: 'source', policy: { limit: 1, windowMs: 1_000 } }]));
});

test('accepts only a valid signed IP from the trusted proxy', () => {
  const secret = crypto.randomBytes(32).toString('hex');
  const ip = '203.0.113.42';
  const signature = crypto.createHmac('sha256', secret).update(ip).digest('hex');

  assert.equal(verifyTrustedClientIp(ip, signature, secret), ip);
  assert.equal(verifyTrustedClientIp(ip, '0'.repeat(64), secret), null);
  assert.equal(verifyTrustedClientIp('not-an-ip', signature, secret), null);
  assert.equal(verifyTrustedClientIp(null, signature, secret), null);
  const otherAddressInSubnet = '2001:db8:abcd:12::99';
  const otherSignature = crypto.createHmac('sha256', secret).update(otherAddressInSubnet).digest('hex');
  assert.equal(verifyTrustedClientIp(otherAddressInSubnet, otherSignature, secret), '2001:db8:abcd:12::/64');
  assert.equal(verifyTrustedClientIp('2001:db8:abcd:12::1', crypto.createHmac('sha256', secret).update('2001:db8:abcd:12::1').digest('hex'), secret), '2001:db8:abcd:12::/64');
});