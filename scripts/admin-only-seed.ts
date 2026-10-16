import { hashPassword, initialsOf } from '../src/lib/crypto.ts';
import { CAT_CODES, CATS } from '../src/lib/catalog.ts';
import { isValidHandle, isValidPassword, normalizeHandle } from '../src/lib/account-validation.ts';

type AdminSeedEnv = {
  ADMIN_HANDLE?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_LEVEL?: string;
};

type AdminSeedTransaction = {
  category: {
    createMany(args: { data: Array<{ code: string; name: string; icon: string; color: string; sortOrder: number }>; skipDuplicates: true }): Promise<unknown>;
  };
  user: {
    upsert(args: {
      where: { handle: string };
      create: { handle: string; initials: string; level: number; passwordHash: string; role: 'ADMIN' };
      update: { initials: string; level: number; passwordHash: string; role: 'ADMIN' };
    }): Promise<unknown>;
  };
};

export type AdminSeedDatabase = {
  $transaction<T>(callback: (transaction: AdminSeedTransaction) => Promise<T>): Promise<T>;
};

export type AdminSeedCredentials = {
  handle: string;
  password: string;
  level: number;
};

export function readAdminSeedCredentials(env: AdminSeedEnv): AdminSeedCredentials {
  const handle = env.ADMIN_HANDLE === undefined ? '' : normalizeHandle(env.ADMIN_HANDLE);
  const password = env.ADMIN_PASSWORD ?? '';

  if (!handle || !password) {
    throw new Error('Le mode --admin-only exige ADMIN_HANDLE et ADMIN_PASSWORD.');
  }
  if (!isValidHandle(handle)) {
    throw new Error('ADMIN_HANDLE doit respecter le format de pseudo accepté lors de l’inscription.');
  }
  if (!isValidPassword(password)) {
    throw new Error('ADMIN_PASSWORD doit contenir entre 8 et 128 caractères.');
  }

  const level = env.ADMIN_LEVEL === undefined || env.ADMIN_LEVEL === '' ? 3 : Number(env.ADMIN_LEVEL);
  if (!Number.isInteger(level) || level < 1 || level > 3) {
    throw new Error('ADMIN_LEVEL doit être un entier entre 1 et 3.');
  }

  return { handle, password, level };
}

export async function runAdminOnlySeed(database: AdminSeedDatabase, env: AdminSeedEnv) {
  const credentials = readAdminSeedCredentials(env);
  const passwordHash = hashPassword(credentials.password);
  const initials = initialsOf(credentials.handle);

  await database.$transaction(async transaction => {
    await transaction.category.createMany({
      data: CAT_CODES.map((code, sortOrder) => ({
        code,
        name: CATS[code].name,
        icon: CATS[code].icon,
        color: CATS[code].color,
        sortOrder,
      })),
      skipDuplicates: true,
    });

    await transaction.user.upsert({
      where: { handle: credentials.handle },
      create: {
        handle: credentials.handle,
        initials,
        level: credentials.level,
        passwordHash,
        role: 'ADMIN',
      },
      update: {
        initials,
        level: credentials.level,
        passwordHash,
        role: 'ADMIN',
      },
    });
  });

  return { handle: credentials.handle, categoryCount: CAT_CODES.length };
}

export async function dispatchSeedMode<T>(
  args: string[],
  runAdminOnly: () => Promise<T>,
  runFullSeed: () => Promise<T>,
) {
  return args.includes('--admin-only') ? runAdminOnly() : runFullSeed();
}