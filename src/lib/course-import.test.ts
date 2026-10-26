import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getDemoCourses,
  missingDemoCategories,
  planDemoCourseImport,
  runDemoCourseImport,
  type CourseImportStore,
  type DemoCourse,
  type ExistingCourse,
} from './course-import';

function positionKey(course: Pick<DemoCourse, 'level' | 'position'>) {
  return `${course.level}:${course.position}`;
}

test('catalogue import contains exactly 20 courses at each of levels 1 and 2', () => {
  const courses = getDemoCourses();
  assert.equal(courses.length, 40);
  assert.deepEqual(courses.filter(course => course.level === 1).map(course => course.position), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.deepEqual(courses.filter(course => course.level === 2).map(course => course.position), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.equal(courses.some(course => course.level === 3), false);
});

test('occupied positions are reported and never selected for creation', () => {
  const [sameCourse, conflictingCourse, freeCourse] = getDemoCourses();
  const existing: ExistingCourse[] = [
    { ...sameCourse, id: 'existing-same', published: true },
    { ...conflictingCourse, id: 'existing-different', title: 'Cours personnalisé', published: true },
  ];

  const plan = planDemoCourseImport([sameCourse, conflictingCourse, freeCourse], existing);
  assert.deepEqual(plan.toCreate, [freeCourse]);
  assert.equal(plan.alreadyPresent[0].existing.id, 'existing-same');
  assert.equal(plan.conflicts[0].existing.title, 'Cours personnalisé');
});

test('an unpublished course occupying a demo position is a conflict, not an import success', () => {
  const [demo] = getDemoCourses();
  const plan = planDemoCourseImport([demo], [{ ...demo, id: 'draft-course', published: false }]);
  assert.deepEqual(plan.toCreate, []);
  assert.deepEqual(plan.alreadyPresent, []);
  assert.equal(plan.conflicts[0].existing.id, 'draft-course');
});

test('preview performs no writes and importing all courses twice is idempotent', async () => {
  const courses = getDemoCourses();
  const stored = new Map<string, ExistingCourse>();
  const writes: Array<DemoCourse & { description: string; published: true }> = [];
  const store: CourseImportStore = {
    async findExisting() { return [...stored.values()]; },
    async create(course) {
      writes.push(course);
      stored.set(positionKey(course), { ...course, id: `course-${writes.length}`, published: course.published });
    },
  };

  const preview = await runDemoCourseImport(store, courses, false);
  assert.equal(preview.toCreate.length, 40);
  assert.equal(preview.created.length, 0);
  assert.equal(writes.length, 0);

  const firstImport = await runDemoCourseImport(store, courses, true);
  const secondImport = await runDemoCourseImport(store, courses, true);
  assert.equal(firstImport.created.length, 40);
  assert.equal(secondImport.created.length, 0);
  assert.equal(secondImport.alreadyPresent.length, 40);
  assert.equal(writes.length, 40);
  assert.equal(writes.every(course => course.published && !('documents' in course)), true);
});

test('a unique-position race is reported without replacing the concurrent row', async () => {
  const [course] = getDemoCourses();
  const store: CourseImportStore = {
    async findExisting() { return []; },
    async create() { throw Object.assign(new Error('occupied'), { code: 'P2002' }); },
  };

  const result = await runDemoCourseImport(store, [course], true);
  assert.deepEqual(result.created, []);
  assert.deepEqual(result.concurrentConflicts, [course]);
});

test('apply is blocked before writes when a known position conflict exists', async () => {
  const [course] = getDemoCourses();
  let writes = 0;
  const store: CourseImportStore = {
    async findExisting() { return [{ ...course, id: 'custom-course', title: 'Cours personnalisé', published: true }]; },
    async create() { writes++; },
  };

  const result = await runDemoCourseImport(store, [course], true);
  assert.equal(result.blockedByConflicts, true);
  assert.deepEqual(result.created, []);
  assert.equal(writes, 0);
});

test('missing categories are reported instead of being created by the importer', () => {
  assert.deepEqual(missingDemoCategories(['SYS', 'REC', 'WEB']), ['EXP']);
  assert.deepEqual(missingDemoCategories(['SYS', 'REC', 'WEB', 'EXP']), []);
});