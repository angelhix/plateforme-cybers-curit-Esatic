import { CAT_CODES, getCourse, type CatCode, type Level } from './catalog';

const DEMO_LEVELS: Level[] = [1, 2];

export type DemoCourse = {
  level: Level;
  position: number;
  title: string;
  categoryCode: CatCode;
};

export type ExistingCourse = {
  id: string;
  level: number;
  position: number;
  title: string;
  categoryCode: string;
  published: boolean;
};

export type CourseImportPlan = {
  toCreate: DemoCourse[];
  alreadyPresent: Array<{ demo: DemoCourse; existing: ExistingCourse }>;
  conflicts: Array<{ demo: DemoCourse; existing: ExistingCourse }>;
};

export function getDemoCourses(): DemoCourse[] {
  return DEMO_LEVELS.flatMap(level => Array.from({ length: 20 }, (_, index) => {
    const course = getCourse(level, index);
    if (!course) throw new Error(`Cours de démonstration manquant : niveau ${level}, position ${index + 1}.`);
    return {
      level,
      position: index + 1,
      title: course.title,
      categoryCode: course.catCode,
    };
  }));
}

export function planDemoCourseImport(demoCourses: DemoCourse[], existingCourses: ExistingCourse[]): CourseImportPlan {
  const existingByPosition = new Map(existingCourses.map(course => [`${course.level}:${course.position}`, course]));
  const plan: CourseImportPlan = { toCreate: [], alreadyPresent: [], conflicts: [] };

  for (const demo of demoCourses) {
    const existing = existingByPosition.get(`${demo.level}:${demo.position}`);
    if (!existing) {
      plan.toCreate.push(demo);
    } else if (existing.title === demo.title && existing.categoryCode === demo.categoryCode && existing.published) {
      plan.alreadyPresent.push({ demo, existing });
    } else {
      plan.conflicts.push({ demo, existing });
    }
  }

  return plan;
}

export type CourseImportStore = {
  findExisting(courses: DemoCourse[]): Promise<ExistingCourse[]>;
  create(course: DemoCourse & { description: string; published: true }): Promise<void>;
};

export async function runDemoCourseImport(store: CourseImportStore, demoCourses: DemoCourse[], apply: boolean) {
  const plan = planDemoCourseImport(demoCourses, await store.findExisting(demoCourses));
  if (!apply || plan.conflicts.length) {
    return {
      ...plan,
      created: [] as DemoCourse[],
      concurrentConflicts: [] as DemoCourse[],
      blockedByConflicts: apply && plan.conflicts.length > 0,
    };
  }

  const created: DemoCourse[] = [];
  const concurrentConflicts: DemoCourse[] = [];
  for (const course of plan.toCreate) {
    try {
      await store.create({
        ...course,
        description: 'Cours de démonstration importé depuis le catalogue statique.',
        published: true,
      });
      created.push(course);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        concurrentConflicts.push(course);
        continue;
      }
      throw error;
    }
  }

  return { ...plan, created, concurrentConflicts, blockedByConflicts: false };
}

export function missingDemoCategories(existingCategoryCodes: string[]) {
  const existing = new Set(existingCategoryCodes);
  return CAT_CODES.filter(code => !existing.has(code));
}
