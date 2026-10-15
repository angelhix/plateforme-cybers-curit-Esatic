import 'server-only';
import type { UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { prisma } from './prisma';
import { newToken, sha256 } from './crypto';

const COOKIE = 'ctf_session';
const TTL_MS = 30 * 24 * 3600 * 1000;

export function safeNextPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  try {
    const target = new URL(value, 'https://app.invalid');
    if (target.origin !== 'https://app.invalid') return '/';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/';
  }
}

export type SessionUser = { id: number; handle: string; initials: string; level: 1 | 2 | 3; role: UserRole };

export async function createSession(userId: number) {
  const token = newToken();
  const expires = Date.now() + TTL_MS;
  await prisma.session.create({
    data: { tokenHash: sha256(token), userId, expiresAt: new Date(expires) },
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIE);
}

/** Utilisateur connecté, ou null. Mis en cache pour la durée d'une requête. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findFirst({
    where: { tokenHash: sha256(token), expiresAt: { gt: new Date() } },
    select: {
      user: { select: { id: true, handle: true, initials: true, level: true, role: true } },
    },
  });
  const user = session?.user;
  if (!user || ![1, 2, 3].includes(user.level)) return null;
  return { ...user, level: user.level as SessionUser['level'] };
});
