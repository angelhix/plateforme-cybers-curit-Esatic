import assert from 'node:assert/strict';
import test from 'node:test';
import { courseLinkForCategory } from './course-links';

test('challenge course links point to the first existing published candidate', () => {
  const link = courseLinkForCategory([
    { level: 1, position: 6, title: 'OSINT avancé', categoryCode: 'REC' },
    { level: 1, position: 2, title: 'Cours personnalisé', categoryCode: 'SYS' },
    { level: 1, position: 1, title: 'Linux publié', categoryCode: 'SYS' },
    { level: 2, position: 1, title: 'Administration', categoryCode: 'SYS' },
  ], 1, 'SYS');

  assert.deepEqual(link, { title: 'Linux publié', href: '/cours/1/01' });
});

test('no link is returned when no published database course matches', () => {
  assert.equal(courseLinkForCategory([], 1, 'SYS'), null);
  assert.equal(courseLinkForCategory([
    { level: 2, position: 1, title: 'Administration', categoryCode: 'SYS' },
  ], 1, 'SYS'), null);
});