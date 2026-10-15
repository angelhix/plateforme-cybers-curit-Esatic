'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checkFlag, hashPassword, initialsOf, verifyPassword } from '@/lib/crypto';
import { createSession, destroySession, getCurrentUser, safeNextPath } from '@/lib/auth';
import {
  consumeFlagLimits,
  consumeLoginLimits,
  consumeRegistrationLimits,
  RateLimitUnavailableError,
  resetLoginAccountLimit,
} from '@/lib/rate-limit';

export type FlagState = { status: 'idle' | 'ok' | 'err' | 'auth' | 'rate' | 'missing' | 'unavailable'; at?: number };

const MAX_ATTEMPTS_PER_MINUTE = 10;

export async function submitFlag(challengeId: string, _prev: FlagState, form: FormData): Promise<FlagState> {
  const user = await getCurrentUser();
  if (!user) return { status: 'auth', at: Date.now() };
  const flag = String(form.get('flag') ?? '').slice(0, 200);
  if (!flag.trim()) return { status: 'err', at: Date.now() };

  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, published: true },
    select: { id: true, flagHash: true },
  });
  if (!challenge) return { status: 'missing', at: Date.now() };
  const solved = await prisma.solve.findUnique({
    where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
    select: { userId: true },
  });
  if (solved) return { status: 'ok', at: Date.now() };

  try {
    const limit = await consumeFlagLimits(user.id, challenge.id);
    if (!limit.allowed) return { status: 'rate', at: Date.now() };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return { status: 'unavailable', at: Date.now() };
    throw error;
  }

  const now = Date.now();
  const createdAt = new Date(now);
  const retryTransaction = async (retriesRemaining: number): Promise<{ status: 'rate' | 'ok' | 'err' }> => {
    try {
      return await prisma.$transaction(async tx => {
        const recent = await tx.flagAttempt.count({
          where: { userId: user.id, createdAt: { gt: new Date(now - 60_000) } },
        });
        if (recent >= MAX_ATTEMPTS_PER_MINUTE) return { status: 'rate' };

        const ok = checkFlag(flag, challenge.flagHash);
        await tx.flagAttempt.create({
          data: { userId: user.id, challengeId: challenge.id, correct: ok, createdAt },
        });
        if (ok) {
          await tx.solve.createMany({
            data: [{ userId: user.id, challengeId: challenge.id, solvedAt: createdAt }],
            skipDuplicates: true,
          });
        }
        return { status: ok ? 'ok' : 'err' };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && retriesRemaining > 0) {
        return retryTransaction(retriesRemaining - 1);
      }
      throw error;
    }
  };

  const result = await retryTransaction(2);
  if (result.status === 'rate') return { status: 'rate', at: now };
  revalidatePath('/', 'layout');
  return { status: result.status, at: now };
}

export type AuthState = { error?: string; handle?: string };

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;
const MAX_PASSWORD_LENGTH = 128;
let dummyPasswordHash: string | undefined;

function verifyLoginPassword(password: string, passwordHash?: string) {
  dummyPasswordHash ??= hashPassword('invalid-account-placeholder');
  return verifyPassword(password, passwordHash ?? dummyPasswordHash);
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const rawHandle = String(form.get('handle') ?? '').trim().toLowerCase();
  const handle = rawHandle.slice(0, 20);
  const password = String(form.get('password') ?? '');
  if (rawHandle.length > 20 || password.length > MAX_PASSWORD_LENGTH) {
    return { error: 'Pseudo ou mot de passe incorrect.', handle };
  }

  try {
    const limit = await consumeLoginLimits(handle);
    if (!limit.allowed) return { error: 'Pseudo ou mot de passe incorrect.', handle };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return { error: 'Le service de connexion est temporairement indisponible.', handle };
    }
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { handle },
    select: { id: true, passwordHash: true },
  });
  if (!verifyLoginPassword(password, user?.passwordHash) || !user) {
    return { error: 'Pseudo ou mot de passe incorrect.', handle };
  }

  try {
    await resetLoginAccountLimit(handle);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return { error: 'Le service de connexion est temporairement indisponible.', handle };
    }
    throw error;
  }
  await createSession(user.id);
  redirect(safeNextPath(form.get('next')));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const handle = String(form.get('handle') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const level = Number(form.get('level'));
  if (!HANDLE_RE.test(handle)) return { error: 'Pseudo : 3 à 20 caractères, lettres minuscules, chiffres, « . », « _ » ou « - ».', handle };
  if (password.length < 8 || password.length > MAX_PASSWORD_LENGTH) return { error: 'Le mot de passe doit contenir entre 8 et 128 caractères.', handle };
  if (![1, 2, 3].includes(level)) return { error: 'Choisis ton niveau.', handle };

  try {
    const limit = await consumeRegistrationLimits();
    if (!limit.allowed) return { error: 'Impossible de créer ce compte pour le moment. Réessaie plus tard.', handle };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return { error: 'Le service d’inscription est temporairement indisponible.', handle };
    }
    throw error;
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        handle,
        initials: initialsOf(handle),
        level,
        passwordHash: hashPassword(password),
        role: 'PLAYER',
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'Impossible de créer ce compte avec ces informations.', handle };
    }
    throw error;
  }
  await createSession(user.id);
  redirect(safeNextPath(form.get('next')));
}

export async function logout() {
  await destroySession();
  redirect('/');
}