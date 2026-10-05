import 'server-only';
import { db } from './db';
import { CATS, LEVELS, banner, courseForCategory, levelLabel, type CatCode, type Level } from './catalog';

export type Status = 'done' | 'progress' | 'todo';
export const STATUS: Record<Status, { label: string; color: string; icon: string }> = {
  done: { label: 'Résolu', color: '#00C853', icon: 'ph-check-circle' },
  progress: { label: 'En cours', color: '#00B8D9', icon: 'ph-circle-notch' },
  todo: { label: 'À tenter', color: '#7F97AA', icon: 'ph-circle' },
};

type Row = {
  id: string; title: string; category: CatCode; level: Level; points: number;
  description: string; goal: string; cmd: string; output: string; solves: number; solved: number; tried: number;
};

export type Challenge = ReturnType<typeof decorate>;

function decorate(r: Row) {
  const C = CATS[r.category], L = LEVELS[r.level];
  const st: Status = r.solved ? 'done' : r.tried ? 'progress' : 'todo';
  const course = courseForCategory(r.level, r.category);
  return {
    id: r.id, title: r.title, catCode: r.category, catName: C.name, catIcon: C.icon, catColor: C.color,
    level: r.level, lvName: L.name, lvColor: L.color, lvLabel: levelLabel(r.level), pts: r.points, solves: r.solves,
    desc: r.description, goal: r.goal, cmd: r.cmd, out: r.output, banner: banner(C.color),
    status: st, isDone: st === 'done', stLabel: STATUS[st].label, stColor: STATUS[st].color, stIcon: STATUS[st].icon,
    course, href: `/defis/${r.id}`,
  };
}

const CH_SELECT = `
  SELECT c.id, c.title, c.category, c.level, c.points, c.description, c.goal, c.cmd, c.output,
    (SELECT COUNT(*) FROM solves s WHERE s.challenge_id = c.id) AS solves,
    EXISTS (SELECT 1 FROM solves s WHERE s.challenge_id = c.id AND s.user_id = @uid) AS solved,
    EXISTS (SELECT 1 FROM attempts a WHERE a.challenge_id = c.id AND a.user_id = @uid) AS tried
  FROM challenges c WHERE c.published = 1`;

export function listChallenges(uid: number | null) {
  return (db().prepare(CH_SELECT + ' ORDER BY c.id').all({ uid: uid ?? -1 }) as Row[]).map(decorate);
}

export function getChallenge(id: string, uid: number | null) {
  const r = db().prepare(CH_SELECT + ' AND c.id = @id').get({ uid: uid ?? -1, id }) as Row | undefined;
  return r ? decorate(r) : null;
}

export type BoardEntry = {
  id: number; handle: string; initials: string; level: Level; pts: number; solved: number;
  rank: number; lvName: string; medal: string | null;
};

/** Classement général : points décroissants, puis le premier arrivé à ce score. */
export function leaderboard(): BoardEntry[] {
  const rows = db().prepare(`
    SELECT u.id, u.handle, u.initials, u.level,
      COALESCE(SUM(c.points), 0) AS pts, COUNT(c.id) AS solved, MAX(s.solved_at) AS last
    FROM users u
    LEFT JOIN solves s ON s.user_id = u.id
    LEFT JOIN challenges c ON c.id = s.challenge_id AND c.published = 1
    GROUP BY u.id
    ORDER BY pts DESC, (last IS NULL), last ASC, u.handle ASC`).all() as (Omit<BoardEntry, 'rank' | 'lvName' | 'medal'> & { last: number | null })[];
  const medals = ['#F2C94C', '#C9D3DC', '#D08B5B'];
  return rows.map((r, i) => ({ id: r.id, handle: r.handle, initials: r.initials, level: r.level, pts: r.pts, solved: r.solved,
    rank: i + 1, lvName: LEVELS[r.level].name, medal: medals[i] ?? null }));
}

export function userPoints(uid: number) {
  const r = db().prepare(`SELECT COALESCE(SUM(c.points), 0) AS pts FROM solves s JOIN challenges c ON c.id = s.challenge_id
    WHERE s.user_id = ? AND c.published = 1`).get(uid) as { pts: number };
  return r.pts;
}

/** Défis résolus par un utilisateur, du plus récent au plus ancien. */
export function solvedBy(uid: number) {
  const ids = db().prepare(`SELECT s.challenge_id AS id FROM solves s JOIN challenges c ON c.id = s.challenge_id
    WHERE s.user_id = ? AND c.published = 1 ORDER BY s.solved_at DESC, s.challenge_id DESC`).all(uid) as { id: string }[];
  const all = new Map(listChallenges(uid).map(c => [c.id, c]));
  return ids.map(r => all.get(r.id)!).filter(Boolean);
}
