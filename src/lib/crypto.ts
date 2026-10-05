// Hachage des flags et des mots de passe (serveur uniquement).
import crypto from 'node:crypto';

const DEV_SECRET = 'dev-only-flag-secret-change-me';

function flagSecret() {
  const s = process.env.FLAG_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('FLAG_SECRET doit être défini en production.');
  return DEV_SECRET;
}

/** Accepte « ESATIC{xxx} » ou « xxx » : on ne garde que le contenu entre accolades. */
export function normalizeFlag(input: string) {
  const t = input.trim();
  const m = /^ESATIC\{(.*)\}$/s.exec(t);
  return m ? m[1] : t;
}

export function hashFlag(flag: string) {
  return crypto.createHmac('sha256', flagSecret()).update(normalizeFlag(flag)).digest('hex');
}

export function checkFlag(input: string, storedHash: string) {
  const a = Buffer.from(hashFlag(input), 'hex'), b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, keyHex] = stored.split('$');
  if (algo !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = Buffer.from(keyHex, 'hex');
  const got = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), key.length);
  return crypto.timingSafeEqual(got, key);
}

export function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

/** « k4rim_b » → « KB », « ines.t » → « IT ». */
export function initialsOf(handle: string) {
  const parts = handle.split(/[._-]+/).filter(Boolean);
  const s = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : handle.slice(0, 2);
  return s.toUpperCase();
}
