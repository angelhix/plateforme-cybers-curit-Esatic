import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRateLimits,
  clientIpFromVercelHeaders,
  createPostgresRateLimitStore,
  RATE_LIMIT_POLICIES,
  RateLimitUnavailableError,
  type AtomicRateLimitStore,
  type RateLimitPolicy,
  type RateLimitResult,
} from './rate-limit-core';

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

test('accepts a single valid Vercel forwarded client IP', () => {
  assert.equal(clientIpFromVercelHeaders(new Headers({ 'x-forwarded-for': '203.0.113.42' })), '203.0.113.42');
  assert.equal(clientIpFromVercelHeaders(new Headers({ 'x-forwarded-for': '2001:db8:abcd:12::99' })), '2001:db8:abcd:12::/64');
});

test('rejects missing, malformed, whitespace-padded, and ambiguous forwarded IPs', () => {
  assert.equal(clientIpFromVercelHeaders(new Headers()), null);
  assert.equal(clientIpFromVercelHeaders(new Headers({ 'x-forwarded-for': 'not-an-ip' })), null);
  assert.equal(clientIpFromVercelHeaders({ get: () => ' 203.0.113.42' }), null);
  assert.equal(clientIpFromVercelHeaders(new Headers({ 'x-forwarded-for': '203.0.113.42, 198.51.100.7' })), null);
});

test('ignores client-supplied custom IP/signature headers', () => {
  const spoofed = new Headers({
    'x-ctf-client-ip': '203.0.113.42',
    'x-ctf-client-ip-signature': 'a'.repeat(64),
    'x-real-ip': '203.0.113.42',
  });
  assert.equal(clientIpFromVercelHeaders(spoofed), null);

  spoofed.set('x-forwarded-for', '198.51.100.8, 203.0.113.42');
  assert.equal(clientIpFromVercelHeaders(spoofed), null);
});

test('database store fails closed when its query fails or returns no row', async () => {
  const brokenStore = createPostgresRateLimitStore(async () => { throw new Error('database unavailable'); });
  const emptyStore = createPostgresRateLimitStore(async () => []);
  const policy = { limit: 1, windowMs: 1_000 };

  await assert.rejects(() => brokenStore.consume('key', policy), RateLimitUnavailableError);
  await assert.rejects(() => emptyStore.consume('key', policy), RateLimitUnavailableError);
});