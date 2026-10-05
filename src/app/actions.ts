'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { checkFlag, hashPassword, initialsOf, verifyPassword } from '@/lib/crypto';
import { createSession, destroySession, getCurrentUser } from '@/lib/auth';

export type FlagState = { status: 'idle' | 'ok' | 'err' | 'auth' | 'rate' | 'missing'; at?: number };

const MAX_ATTEMPTS_PER_MINUTE = 10;

export async function submitFlag(challengeId: string, _prev: FlagState, form: FormData): Promise<FlagState> {
  const user = await getCurrentUser();
  if (!user) return { status: 'auth', at: Date.now() };
  const flag = String(form.get('flag') ?? '').slice(0, 200);
  if (!flag.trim()) return { status: 'err', at: Date.now() };

  const d = db();
  const ch = d.prepare('SELECT id, flag_hash FROM challenges WHERE id = ? AND published = 1').get(challengeId) as { id: string; flag_hash: string } | undefined;
  if (!ch) return { status: 'missing', at: Date.now() };
  if (d.prepare('SELECT 1 FROM solves WHERE user_id = ? AND challenge_id = ?').get(user.id, ch.id)) return { status: 'ok', at: Date.now() };

  const now = Date.now();
  const recent = d.prepare('SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND created_at > ?').get(user.id, now - 60_000) as { n: number };
  if (recent.n >= MAX_ATTEMPTS_PER_MINUTE) return { status: 'rate', at: now };

  const ok = checkFlag(flag, ch.flag_hash);
  d.transaction(() => {
    d.prepare('INSERT INTO attempts (user_id, challenge_id, correct, created_at) VALUES (?, ?, ?, ?)').run(user.id, ch.id, ok ? 1 : 0, now);
    if (ok) d.prepare('INSERT OR IGNORE INTO solves (user_id, challenge_id, solved_at) VALUES (?, ?, ?)').run(user.id, ch.id, now);
  })();
  revalidatePath('/', 'layout');
  return { status: ok ? 'ok' : 'err', at: now };
}

export type AuthState = { error?: string; handle?: string };

const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;

function safeNext(v: FormDataEntryValue | null) {
  const s = String(v ?? '');
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

export async function login(_prev: AuthState, form: FormData): Promise<AuthState> {
  const handle = String(form.get('handle') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const u = db().prepare('SELECT id, password_hash FROM users WHERE handle = ?').get(handle) as { id: number; password_hash: string } | undefined;
  if (!u || !verifyPassword(password, u.password_hash)) return { error: 'Pseudo ou mot de passe incorrect.', handle };
  await createSession(u.id);
  redirect(safeNext(form.get('next')));
}

export async function register(_prev: AuthState, form: FormData): Promise<AuthState> {
  const handle = String(form.get('handle') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const level = Number(form.get('level'));
  if (!HANDLE_RE.test(handle)) return { error: 'Pseudo : 3 à 20 caractères, lettres minuscules, chiffres, « . », « _ » ou « - ».', handle };
  if (password.length < 8) return { error: 'Le mot de passe doit contenir au moins 8 caractères.', handle };
  if (![1, 2, 3].includes(level)) return { error: 'Choisis ton niveau.', handle };
  const d = db();
  if (d.prepare('SELECT 1 FROM users WHERE handle = ?').get(handle)) return { error: 'Ce pseudo est déjà pris.', handle };
  const r = d.prepare('INSERT INTO users (handle, initials, level, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(handle, initialsOf(handle), level, hashPassword(password), Date.now());
  await createSession(Number(r.lastInsertRowid));
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  await destroySession();
  redirect('/');
}
