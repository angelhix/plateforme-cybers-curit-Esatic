import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { prisma } from '../src/lib/prisma-client';
import {
  getDemoCourses,
  missingDemoCategories,
  runDemoCourseImport,
  type DemoCourse,
} from '../src/lib/course-import';

function formatCourse(course: DemoCourse) {
  return `N${course.level} · position ${String(course.position).padStart(2, '0')} · ${course.title} · ${course.categoryCode}`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(argument => argument !== '--apply') || args.filter(argument => argument === '--apply').length > 1) {
    throw new Error('Usage : node --env-file-if-exists=.env --env-file-if-exists=.env.local --import=tsx scripts/import-demo-courses.ts [--apply]');
  }
  const apply = args.includes('--apply');
  const demoCourses = getDemoCourses();

  try {
    const categories = await prisma.category.findMany({ select: { code: true } });
    const missingCategories = missingDemoCategories(categories.map(category => category.code));
    if (missingCategories.length) {
      console.error(`Import interrompu : catégories absentes en base (${missingCategories.join(', ')}).`);
      process.exitCode = 1;
      return;
    }

    const result = await runDemoCourseImport({
      async findExisting(courses) {
        return prisma.course.findMany({
          where: { OR: courses.map(({ level, position }) => ({ level, position })) },
          select: { id: true, level: true, position: true, title: true, categoryCode: true, published: true },
        });
      },
      async create(course) {
        await prisma.course.create({ data: course, select: { id: true } });
      },
    }, demoCourses, apply);

    console.log(apply ? 'Résultat de l’importation' : 'Prévisualisation de l’importation');
    console.log(`Cours de démonstration : ${demoCourses.length}`);
    console.log(`Positions libres candidates à la création : ${result.toCreate.length}`);
    for (const course of result.toCreate) console.log(`  + ${formatCourse(course)}`);
    console.log(`Déjà présents à la même position : ${result.alreadyPresent.length}`);
    for (const { demo, existing } of result.alreadyPresent) {
      console.log(`  = ${formatCourse(demo)} (base : ${existing.title} · ${existing.published ? 'publié' : 'brouillon'} · id ${existing.id})`);
    }
    console.log(`Conflits de position : ${result.conflicts.length}`);
    for (const { demo, existing } of result.conflicts) {
      console.log(`  ! ${formatCourse(demo)} (occupée par « ${existing.title} » · ${existing.categoryCode} · ${existing.published ? 'publié' : 'brouillon'} · id ${existing.id})`);
    }

    if (!apply) {
      console.log('Aucune écriture effectuée. --apply créera ces positions libres seulement si aucun conflit n’est détecté.');
      return;
    }
    if (result.blockedByConflicts) {
      console.log('Importation bloquée : examinez et résolvez explicitement les conflits, puis relancez la prévisualisation. Aucune écriture effectuée.');
      process.exitCode = 2;
      return;
    }

    console.log(`Créés : ${result.created.length}`);
    for (const course of result.created) console.log(`  + ${formatCourse(course)}`);
    console.log(`Conflits apparus pendant l’import (ignorés) : ${result.concurrentConflicts.length}`);
    for (const course of result.concurrentConflicts) console.log(`  ! ${formatCourse(course)}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}