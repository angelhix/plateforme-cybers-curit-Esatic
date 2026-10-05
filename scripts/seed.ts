// Charge les défis en base (flags hachés) et, avec --demo, les joueurs de démonstration de la maquette.
//   npm run db:seed            → défis uniquement (met à jour sans toucher aux résolutions)
//   npm run db:seed -- --demo  → + 7 comptes de démo (mot de passe : demo1234)
// Source : data/challenges.json (vrais flags, non versionné) sinon data/challenges.example.json.
import fs from 'node:fs';
import path from 'node:path';
import { openDb } from '../src/lib/db.ts';
import { hashFlag, hashPassword, initialsOf } from '../src/lib/crypto.ts';

type Seed = { id: string; title: string; category: string; level: number; points: number; description: string; goal: string; cmd: string; output: string; flag: string; published?: boolean };

if (!process.env.FLAG_SECRET) {
  console.warn('⚠ FLAG_SECRET absent : flags hachés avec le secret de développement. `npm start` les refusera — définis FLAG_SECRET dans .env puis relance le seed.');
}

const dataDir = path.join(process.cwd(), 'data');
const real = path.join(dataDir, 'challenges.json');
const file = fs.existsSync(real) ? real : path.join(dataDir, 'challenges.example.json');
const seeds = JSON.parse(fs.readFileSync(file, 'utf8')) as Seed[];

const db = openDb();
const upsert = db.prepare(`
  INSERT INTO challenges (id, title, category, level, points, description, goal, cmd, output, flag_hash, published)
  VALUES (@id, @title, @category, @level, @points, @description, @goal, @cmd, @output, @flag_hash, @published)
  ON CONFLICT(id) DO UPDATE SET title = excluded.title, category = excluded.category, level = excluded.level, points = excluded.points,
    description = excluded.description, goal = excluded.goal, cmd = excluded.cmd, output = excluded.output,
    flag_hash = excluded.flag_hash, published = excluded.published`);

db.transaction(() => {
  for (const s of seeds) {
    const { flag, ...rest } = s;
    upsert.run({ ...rest, flag_hash: hashFlag(flag), published: s.published === false ? 0 : 1 });
  }
})();
console.log(`${seeds.length} défis chargés depuis ${path.relative(process.cwd(), file)}`);

if (process.argv.includes('--demo')) {
  // Joueurs de la maquette : [pseudo, niveau, défis NON résolus]. a_kouame = l'utilisateur de la maquette.
  const DEMO: [string, number, number[] | 'mockup'][] = [
    ['k4rim_b', 3, [10, 15]], ['n_diaby', 3, [9, 10, 14]], ['ines.t', 2, [9, 11, 14]], ['m_coulibaly', 2, [9, 10, 11, 15]],
    ['yao_s3c', 2, [9, 10, 11, 14, 15]], ['f_ouattara', 2, [9, 10, 11, 12, 14, 15]], ['a_kouame', 2, 'mockup'],
  ];
  const MOCKUP_SOLVED = ['CH-001', 'CH-002', 'CH-003', 'CH-006', 'CH-008', 'CH-013'];
  const ids = seeds.map(s => s.id);
  const pw = hashPassword('demo1234');
  const addUser = db.prepare('INSERT OR IGNORE INTO users (handle, initials, level, password_hash, created_at) VALUES (?, ?, ?, ?, ?)');
  const addSolve = db.prepare('INSERT OR IGNORE INTO solves (user_id, challenge_id, solved_at) VALUES (?, ?, ?)');
  const day = 24 * 3600 * 1000, t0 = Date.now() - 30 * day;
  db.transaction(() => {
    DEMO.forEach(([handle, level, skip], ui) => {
      addUser.run(handle, initialsOf(handle), level, pw, Date.now());
      const { id } = db.prepare('SELECT id FROM users WHERE handle = ?').get(handle) as { id: number };
      const solved = skip === 'mockup' ? MOCKUP_SOLVED : ids.filter(c => !skip.includes(Number(c.slice(3))));
      solved.forEach((c, i) => addSolve.run(id, c, t0 + i * day + ui * 3600 * 1000));
      if (skip === 'mockup') {
        db.prepare('INSERT INTO attempts (user_id, challenge_id, correct, created_at) SELECT ?, ?, 0, ? WHERE NOT EXISTS (SELECT 1 FROM attempts WHERE user_id = ? AND challenge_id = ?)')
          .run(id, 'CH-004', t0, id, 'CH-004');
      }
    });
  })();
  console.log(`${DEMO.length} comptes de démo prêts (mot de passe : demo1234)`);
}
db.close();
