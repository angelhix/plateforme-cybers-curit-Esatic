import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPassword } from '../src/lib/crypto.ts';
import { CAT_CODES } from '../src/lib/catalog.ts';
import { dispatchSeedMode, readAdminSeedCredentials, runAdminOnlySeed } from './admin-only-seed.ts';

function fakeDatabase() {
  const calls: Array<{ model: string; operation: string; args: unknown }> = [];
  return {
    calls,
    database: {
      async $transaction<T>(callback: (transaction: {
        category: { createMany(args: unknown): Promise<unknown> };
        user: { upsert(args: unknown): Promise<unknown> };
      }) => Promise<T>) {
        return callback({
          category: { createMany: async args => { calls.push({ model: 'category', operation: 'createMany', args }); } },
          user: { upsert: async args => { calls.push({ model: 'user', operation: 'upsert', args }); } },
        });
      },
    },
  };
}

test('admin-only requires both credentials before opening a transaction', async () => {
  const { database, calls } = fakeDatabase();
  await assert.rejects(() => runAdminOnlySeed(database, {}), /exige ADMIN_HANDLE et ADMIN_PASSWORD/);
  await assert.rejects(() => runAdminOnlySeed(database, { ADMIN_HANDLE: 'admin' }), /exige ADMIN_HANDLE et ADMIN_PASSWORD/);
  await assert.rejects(() => runAdminOnlySeed(database, { ADMIN_PASSWORD: 'long-enough-password' }), /exige ADMIN_HANDLE et ADMIN_PASSWORD/);
  assert.equal(calls.length, 0);
});

test('admin-only enforces the registration handle and password rules', () => {
  assert.throws(() => readAdminSeedCredentials({ ADMIN_HANDLE: 'x', ADMIN_PASSWORD: 'password-123' }), /format de pseudo/);
  assert.throws(() => readAdminSeedCredentials({ ADMIN_HANDLE: 'valid.admin', ADMIN_PASSWORD: 'short' }), /entre 8 et 128/);
  assert.throws(() => readAdminSeedCredentials({ ADMIN_HANDLE: 'valid.admin', ADMIN_PASSWORD: 'p'.repeat(129) }), /entre 8 et 128/);
  assert.deepEqual(readAdminSeedCredentials({ ADMIN_HANDLE: '  VALID.Admin ', ADMIN_PASSWORD: 'secure-password', ADMIN_LEVEL: '2' }), {
    handle: 'valid.admin',
    password: 'secure-password',
    level: 2,
  });
});

test('admin-only creates required categories and upserts only the specified admin', async () => {
  const { database, calls } = fakeDatabase();
  const result = await runAdminOnlySeed(database, {
    ADMIN_HANDLE: 'ctf.admin',
    ADMIN_PASSWORD: 'unique-admin-password',
  });

  assert.deepEqual(result, { handle: 'ctf.admin', categoryCount: CAT_CODES.length });
  assert.deepEqual(calls.map(({ model, operation }) => `${model}.${operation}`), [
    'category.createMany',
    'user.upsert',
  ]);

  const categoryArgs = calls[0].args as { data: Array<{ code: string }>; skipDuplicates: boolean };
  assert.deepEqual(categoryArgs.data.map(category => category.code), CAT_CODES);
  assert.equal(categoryArgs.skipDuplicates, true);

  const userArgs = calls[1].args as {
    where: { handle: string };
    create: { handle: string; role: string; passwordHash: string };
    update: { role: string; passwordHash: string };
  };
  assert.deepEqual(userArgs.where, { handle: 'ctf.admin' });
  assert.equal(userArgs.create.handle, 'ctf.admin');
  assert.equal(userArgs.create.role, 'ADMIN');
  assert.equal(userArgs.update.role, 'ADMIN');
  assert.equal(verifyPassword('unique-admin-password', userArgs.create.passwordHash), true);
  assert.equal(verifyPassword('wrong-password', userArgs.create.passwordHash), false);
});

test('admin-only dispatch never invokes the full seed or challenge loader', async () => {
  const calls: string[] = [];
  await dispatchSeedMode(
    ['--admin-only'],
    async () => { calls.push('admin-only'); },
    async () => { calls.push('full-seed'); },
  );
  assert.deepEqual(calls, ['admin-only']);
});