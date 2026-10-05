// Accès SQLite (serveur uniquement). Une seule connexion par processus.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  handle        TEXT NOT NULL UNIQUE,
  initials      TEXT NOT NULL,
  level         INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS challenges (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('SYS','REC','WEB','EXP')),
  level       INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  points      INTEGER NOT NULL CHECK (points > 0),
  description TEXT NOT NULL,
  goal        TEXT NOT NULL,
  cmd         TEXT NOT NULL,
  output      TEXT NOT NULL,
  flag_hash   TEXT NOT NULL,
  published   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS solves (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  solved_at    INTEGER NOT NULL,
  PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS attempts (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  correct      INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_user_time ON attempts(user_id, created_at);
`;

export function dbPath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'ctf.db');
}

export function openDb(file = dbPath()) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec(SCHEMA);
  return db;
}

const g = globalThis as unknown as { __ctfDb?: Database.Database };

export function db() {
  return (g.__ctfDb ??= openDb());
}
