import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { db } from './db';
import { newToken, sha256 } from './crypto';

const COOKIE = 'ctf_session';
const TTL_MS = 30 * 24 * 3600 * 1000;

export type SessionUser = { id: number; handle: string; initials: string; level: 1 | 2 | 3 };

export async function createSession(userId: number) {
  const token = newToken();
  const expires = Date.now() + TTL_MS;
  db().prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(token), userId, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  jar.delete(COOKIE);
}

/** Utilisateur connecté, ou null. Mis en cache pour la durée d'une requête. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = db().prepare(
    `SELECT u.id, u.handle, u.initials, u.level FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).get(sha256(token), Date.now()) as SessionUser | undefined;
  return row ?? null;
});
