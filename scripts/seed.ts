// Charge les défis en base (flags hachés) et, avec --demo, les joueurs de démonstration de la maquette.
//   npm run db:seed            → défis uniquement (met à jour sans toucher aux résolutions)
//   npm run db:seed -- --demo  → + 7 comptes de démo (mot de passe : demo1234)
// Source : data/challenges.json (vrais flags, non versionné) sinon data/challenges.example.json.
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../src/lib/prisma-client.ts';
import { hashFlag, hashPassword, initialsOf } from '../src/lib/crypto.ts';
import { CAT_CODES, CATS, isCat, type CatCode } from '../src/lib/catalog.ts';

type Seed = { id: string; title: string; category: string; level: number; points: number; description: string; goal: string; cmd: string; output: string; flag: string; published?: boolean };

if (!process.env.FLAG_SECRET) {
  console.warn('⚠ FLAG_SECRET absent : flags hachés avec le secret de développement. `npm start` les refusera — définis FLAG_SECRET dans .env puis relance le seed.');
}

const dataDir = path.join(process.cwd(), 'data');
const real = path.join(dataDir, 'challenges.json');
const file = fs.existsSync(real) ? real : path.join(dataDir, 'challenges.example.json');
const seeds = JSON.parse(fs.readFileSync(file, 'utf8')) as Seed[];
const categoryCodes: CatCode[] = [...new Set(seeds.map(seed => seed.category))].map(code => {
  if (!isCat(code)) throw new Error(`Catégorie inconnue dans ${path.relative(process.cwd(), file)} : ${code}`);
  return code;
});

const demoMode = process.argv.includes('--demo');
let challengeCount = 0;
let demoUsersCreated = 0;
let demoUsersSkipped = 0;
let demoSolvesAdded = 0;
let demoAttemptsAdded = 0;

const adminHandle = process.env.ADMIN_HANDLE?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const adminLevel = Number(process.env.ADMIN_LEVEL ?? 3);

if (Boolean(adminHandle) !== Boolean(adminPassword)) {
  throw new Error('ADMIN_HANDLE et ADMIN_PASSWORD doivent être définis ensemble pour provisionner un administrateur.');
}
if (adminHandle && (!/^[a-z0-9][a-z0-9._-]{2,19}$/.test(adminHandle) || !adminPassword || adminPassword.length < 8)) {
  throw new Error('ADMIN_HANDLE doit contenir 3 à 20 caractères valides et ADMIN_PASSWORD au moins 8 caractères.');
}
if (!Number.isInteger(adminLevel) || ![1, 2, 3].includes(adminLevel)) {
  throw new Error('ADMIN_LEVEL doit être 1, 2 ou 3.');
}

try {
  await prisma.$transaction(async tx => {
    await tx.category.createMany({
      data: categoryCodes.map(code => ({
        code,
        name: CATS[code].name,
        icon: CATS[code].icon,
        color: CATS[code].color,
        sortOrder: CAT_CODES.indexOf(code),
      })),
      skipDuplicates: true,
    });

    if (adminHandle && adminPassword) {
      await tx.user.upsert({
        where: { handle: adminHandle },
        update: {
          initials: initialsOf(adminHandle),
          level: adminLevel,
          passwordHash: hashPassword(adminPassword),
          role: 'ADMIN',
        },
        create: {
          handle: adminHandle,
          initials: initialsOf(adminHandle),
          level: adminLevel,
          passwordHash: hashPassword(adminPassword),
          role: 'ADMIN',
        },
      });
    }

    for (const seed of seeds) {
      const data = {
        title: seed.title,
        categoryCode: seed.category,
        level: seed.level,
        points: seed.points,
        description: seed.description,
        goal: seed.goal,
        command: seed.cmd,
        output: seed.output,
        flagHash: hashFlag(seed.flag),
        published: seed.published !== false,
      };
      await tx.challenge.upsert({
        where: { id: seed.id },
        create: { id: seed.id, ...data },
        update: data,
      });
    }
    challengeCount = seeds.length;
  });

  console.log('Seed PostgreSQL : transaction challenges validée.');
  if (adminHandle) console.log(`Compte admin vérifié : ${adminHandle} (rôle ADMIN).`);
  console.log(`Challenges créés/mis à jour : ${challengeCount}`);
  console.log(`Catégories vérifiées : ${categoryCodes.length}`);
  console.log(`Source : ${path.relative(process.cwd(), file)}`);

  if (demoMode) {
    const DEMO: [string, number, number[] | 'mockup'][] = [
      ['k4rim_b', 3, [10, 15]], ['n_diaby', 3, [9, 10, 14]], ['ines.t', 2, [9, 11, 14]], ['m_coulibaly', 2, [9, 10, 11, 15]],
      ['yao_s3c', 2, [9, 10, 11, 14, 15]], ['f_ouattara', 2, [9, 10, 11, 12, 14, 15]], ['a_kouame', 2, 'mockup'],
    ];
    const MOCKUP_SOLVED = ['CH-001', 'CH-002', 'CH-003', 'CH-006', 'CH-008', 'CH-013'];
    const day = 24 * 3600 * 1000;
    const t0 = Date.now() - 30 * day;
    const demoPasswordHash = hashPassword('demo1234');

    await prisma.$transaction(async tx => {
      const createdUsers: { userId: number; handle: string; skip: number[] | 'mockup'; demoIndex: number }[] = [];

      for (const [demoIndex, [handle, level, skip]] of DEMO.entries()) {
        const createdAt = new Date(Date.now());
        const created = await tx.user.createMany({
          data: [{
            handle,
            initials: initialsOf(handle),
            level,
            passwordHash: demoPasswordHash,
            createdAt,
            role: 'PLAYER',
          }],
          skipDuplicates: true,
        });

        if (created.count === 0) {
          demoUsersSkipped++;
          console.log(`Utilisateur démo existant ignoré : ${handle}`);
          continue;
        }

        const user = await tx.user.findUniqueOrThrow({ where: { handle }, select: { id: true } });
        demoUsersCreated++;
        createdUsers.push({ userId: user.id, handle, skip, demoIndex });
      }

      const solvePlans = createdUsers.map(user => {
        let challengeIds: string[];
        if (user.skip === 'mockup') {
          challengeIds = MOCKUP_SOLVED;
        } else {
          const excludedLevels = user.skip;
          challengeIds = seeds.map(seed => seed.id).filter(id => !excludedLevels.includes(Number(id.slice(3))));
        }
        return { ...user, challengeIds };
      });
      const requiredChallengeIds = [...new Set([
        ...solvePlans.flatMap(plan => plan.challengeIds),
        ...solvePlans.filter(plan => plan.skip === 'mockup').map(() => 'CH-004'),
      ])];
      const existingChallenges = await tx.challenge.findMany({
        where: { id: { in: requiredChallengeIds } },
        select: { id: true },
      });
      const existingChallengeIds = new Set(existingChallenges.map(challenge => challenge.id));
      const missingChallengeIds = requiredChallengeIds.filter(id => !existingChallengeIds.has(id));
      if (missingChallengeIds.length) {
        throw new Error(`Seed démo impossible : challenges requis absents après le seed : ${missingChallengeIds.join(', ')}`);
      }

      for (const user of solvePlans) {
        const solveRows = user.challengeIds.map((challengeId, index) => ({
          userId: user.userId,
          challengeId,
          solvedAt: new Date(t0 + index * day + user.demoIndex * 3600 * 1000),
        }));
        if (solveRows.length) {
          const inserted = await tx.solve.createMany({ data: solveRows, skipDuplicates: true });
          demoSolvesAdded += inserted.count;
        }

        if (user.skip === 'mockup') {
          const existingAttempt = await tx.flagAttempt.findFirst({
            where: { userId: user.userId, challengeId: 'CH-004' },
            select: { id: true },
          });
          if (!existingAttempt) {
            await tx.flagAttempt.create({
              data: { userId: user.userId, challengeId: 'CH-004', correct: false, createdAt: new Date(t0) },
            });
            demoAttemptsAdded++;
          }
        }
      }
    });

    console.log('Transaction demo validée.');
    console.log(`Utilisateurs démo créés : ${demoUsersCreated}`);
    console.log(`Utilisateurs existants ignorés : ${demoUsersSkipped}`);
    console.log(`Solves démo ajoutés : ${demoSolvesAdded}`);
    console.log(`Tentatives démo ajoutées : ${demoAttemptsAdded}`);
  }

  console.log('Seed PostgreSQL terminé.');
} finally {
  await prisma.$disconnect();
}
