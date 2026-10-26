export type PublishedCourseLinkCandidate = {
  level: number;
  position: number;
  title: string;
  categoryCode: string;
};

export function courseLinkForCategory(
  courses: PublishedCourseLinkCandidate[],
  level: number,
  categoryCode: string,
) {
  const course = courses
    .filter(candidate => candidate.level === level && candidate.categoryCode === categoryCode)
    .sort((left, right) => left.position - right.position)[0];

  return course ? {
    title: course.title,
    href: `/cours/${course.level}/${String(course.position).padStart(2, '0')}`,
  } : null;
}