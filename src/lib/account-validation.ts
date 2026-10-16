export const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{2,19}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function normalizeHandle(value: string) {
  return value.trim().toLowerCase();
}

export function isValidHandle(value: string) {
  return HANDLE_RE.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= MIN_PASSWORD_LENGTH && value.length <= MAX_PASSWORD_LENGTH;
}