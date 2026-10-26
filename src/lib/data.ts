import 'server-only';
import { prisma } from './prisma';
import { CATS, LEVELS, banner, levelLabel, type CatCode, type Level } from './catalog';
import { courseLinkForCategory } from './course-links';

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

function decorate(r: Row, course: ReturnType<typeof courseLinkForCategory>) {
  const C = CATS[r.category], L = LEVELS[r.level];
  const st: Status = r.solved ? 'done' : r.tried ? 'progress' : 'todo';
  return {
    id: r.id, title: r.title, catCode: r.category, catName: C.name, catIcon: C.icon, catColor: C.color,
    level: r.level, lvName: L.name, lvColor: L.color, lvLabel: levelLabel(r.level), pts: r.points, solves: r.solves,
    desc: r.description, goal: r.goal, cmd: r.cmd, out: r.output, banner: banner(C.color),
    status: st, isDone: st === 'done', stLabel: STATUS[st].label, stColor: STATUS[st].color, stIcon: STATUS[st].icon,
    course, href: `/defis/${r.id}`,
  };
}

function compareBinary(left: string, right: string) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function challengeSelect(uid: number) {
  return {
    id: true,
    title: true,
    categoryCode: true,
    level: true,
    points: true,
    description: true,
    goal: true,
    command: true,
    output: true,
    _count: { select: { solves: true } },
    solves: { where: { userId: uid }, select: { userId: true } },
    attempts: { where: { userId: uid }, select: { id: true } },
  } as const;
}

function challengeRow(r: {
  id: string; title: string; categoryCode: string; level: number; points: number;
  description: string; goal: string; command: string; output: string;
  _count: { solves: number }; solves: { userId: number }[]; attempts: { id: number }[];
}): Row {
  return {
    id: r.id, title: r.title, category: r.categoryCode as CatCode, level: r.level as Level,
    points: r.points, description: r.description, goal: r.goal, cmd: r.command, output: r.output,
    solves: r._count.solves, solved: r.solves.length ? 1 : 0, tried: r.attempts.length ? 1 : 0,
  };
}

export async function listChallenges(uid: number | null): Promise<Challenge[]> {
  const rows = await prisma.challenge.findMany({
    where: { published: true },
    select: challengeSelect(uid ?? -1),
  });
  const challenges = rows.map(challengeRow).sort((a, b) => compareBinary(a.id, b.id));
  const categories = [...new Map(challenges.map(challenge => [`${challenge.level}:${challenge.category}`, {
    level: challenge.level,
    categoryCode: challenge.category,
  }])).values()];
  const courses = categories.length ? await prisma.course.findMany({
    where: { published: true, OR: categories },
    select: { level: true, position: true, title: true, categoryCode: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  }) : [];
  return challenges.map(challenge => decorate(
    challenge,
    courseLinkForCategory(courses, challenge.level, challenge.category),
  ));
}

export async function getChallenge(id: string, uid: number | null): Promise<Challenge | null> {
  const row = await prisma.challenge.findFirst({
    where: { id, published: true },
    select: challengeSelect(uid ?? -1),
  });
  if (!row) return null;
  const challenge = challengeRow(row);
  const course = await prisma.course.findFirst({
    where: { level: challenge.level, categoryCode: challenge.category, published: true },
    select: { level: true, position: true, title: true, categoryCode: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  return decorate(challenge, course ? courseLinkForCategory([course], challenge.level, challenge.category) : null);
}

export type BoardEntry = {
  id: number; handle: string; initials: string; level: Level; pts: number; solved: number;
  rank: number; lvName: string; medal: string | null;
};

/** Classement général : points décroissants, puis le premier arrivé à ce score. */
export async function leaderboard(): Promise<BoardEntry[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      handle: true,
      initials: true,
      level: true,
      solves: { select: { solvedAt: true, challenge: { select: { points: true, published: true } } } },
    },
  });
  const rows = users.map(user => {
    const publishedSolves = user.solves.filter(solve => solve.challenge.published);
    const last = publishedSolves.reduce<Date | null>((latest, solve) =>
      latest === null || solve.solvedAt > latest ? solve.solvedAt : latest, null);
    return {
      id: user.id,
      handle: user.handle,
      initials: user.initials,
      level: user.level as Level,
      pts: publishedSolves.reduce((total, solve) => total + solve.challenge.points, 0),
      solved: publishedSolves.length,
      last,
    };
  });
  rows.sort((a, b) => b.pts - a.pts
    || (a.last === null ? (b.last === null ? 0 : 1) : b.last === null ? -1 : a.last.getTime() - b.last.getTime())
    || compareBinary(a.handle, b.handle));
  const medals = ['#F2C94C', '#C9D3DC', '#D08B5B'];
  return rows.map((r, i) => ({ id: r.id, handle: r.handle, initials: r.initials, level: r.level, pts: r.pts, solved: r.solved,
    rank: i + 1, lvName: LEVELS[r.level].name, medal: medals[i] ?? null }));
}

export async function userPoints(uid: number): Promise<number> {
  const solves = await prisma.solve.findMany({
    where: { userId: uid, challenge: { is: { published: true } } },
    select: { challenge: { select: { points: true } } },
  });
  return solves.reduce((total, solve) => total + solve.challenge.points, 0);
}

/** Défis résolus par un utilisateur, du plus récent au plus ancien. */
export async function solvedBy(uid: number): Promise<Challenge[]> {
  const solves = await prisma.solve.findMany({
    where: { userId: uid, challenge: { is: { published: true } } },
    select: { challengeId: true, solvedAt: true },
  });
  solves.sort((a, b) => b.solvedAt.getTime() - a.solvedAt.getTime() || compareBinary(b.challengeId, a.challengeId));
  const all = new Map((await listChallenges(uid)).map(challenge => [challenge.id, challenge]));
  return solves.map(solve => all.get(solve.challengeId)!).filter(Boolean);
}
