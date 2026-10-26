import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { LEVELS, LEVEL_IDS, banner, isLevel, type Level } from '@/lib/catalog';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Cours · Plateforme CTF ESATIC' };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ niveau?: string }> }) {
  const { niveau } = await searchParams;
  const me = await getCurrentUser();
  const n = Number(niveau);
  const lvl: Level = isLevel(n) ? n : (me?.level ?? 1);
  const [databaseCourses, publishedCourseCounts] = await Promise.all([
    prisma.course.findMany({
      where: { level: lvl, published: true },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        position: true,
        title: true,
        category: { select: { code: true, name: true, icon: true, color: true, sortOrder: true } },
        documents: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { title: true, kind: true, format: true, storageKey: true },
        },
      },
    }),
    Promise.all(LEVEL_IDS.map(level => prisma.course.count({ where: { level, published: true } }))),
  ]);
  const listedCourses: {
    id: string;
    position: number;
    title: string;
    categoryCode: string;
    category: { code: string; name: string; icon: string; color: string; sortOrder: number };
    documentCount: number;
    documentHref: string | null;
    documentTitle: string | null;
  }[] = databaseCourses.map(course => {
    const document = course.documents.find(item => item.kind === 'PREPARATORY' && item.format === 'PDF') ?? course.documents[0];
    return {
      id: course.id,
      position: course.position,
      title: course.title,
      categoryCode: course.category.code,
      category: course.category,
      documentCount: course.documents.length,
      documentHref: document ? `/${document.storageKey.split('/').map(encodeURIComponent).join('/')}` : null,
      documentTitle: document?.title ?? null,
    };
  });
  const categories = [...new Map(listedCourses.map(course => [course.category.code, course.category])).values()]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.code.localeCompare(right.code));
  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="stack" style={{ gap: 8 }}>
        <h1 className="h1">Cours</h1>
        <p className="lead">Retrouve ici les cours publiés et leurs supports disponibles.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LEVEL_IDS.map(l => (
          <Link key={l} href={`/cours?niveau=${l}`} className={`chip chip-lg${l === lvl ? ' on' : ''}`} aria-current={l === lvl ? 'true' : undefined}>
            <span className="mono" style={{ color: LEVELS[l].color }}>{LEVELS[l].dots}</span>{LEVELS[l].name}
            <span className="mono faint" style={{ fontSize: 12 }}>{publishedCourseCounts[LEVEL_IDS.indexOf(l)]}</span>
          </Link>
        ))}
      </div>

      {listedCourses.length ? (
          <div className="stack" style={{ gap: 40 }}>
            {categories.map((category, i) => {
              const categoryCourses = listedCourses.filter(course => course.categoryCode === category.code);
              return (
                <div key={category.code} className="stack" style={{ gap: 16 }}>
                  <div className="row" style={{ gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: category.color + '1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ph ${category.icon}`} style={{ fontSize: 22, color: category.color }} />
                    </div>
                    <div className="stack">
                      <span className="mono" style={{ fontSize: 11, letterSpacing: '.1em', color: category.color }}>PARTIE {i + 1} · {category.code}</span>
                      <span className="display" style={{ fontSize: 20, fontWeight: 600 }}>{category.name}</span>
                    </div>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
                    {categoryCourses.map(course => {
                      const number = String(course.position).padStart(2, '0');
                      const href = `/cours/${lvl}/${number}`;
                      return (
                        <div key={course.id} className="card lift">
                          <Link href={href} className="stack" style={{ color: 'var(--text)' }}>
                            <div className="banner" style={{ height: 84, background: banner(category.color), alignItems: 'flex-end', justifyContent: 'space-between', padding: '12px 14px' }}>
                              <span className="display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, color: category.color }}>{number}</span>
                              <i className={`ph ${category.icon}`} style={{ fontSize: 24, color: category.color }} />
                            </div>
                            <div className="display" style={{ padding: '14px 14px 6px', fontSize: 17, fontWeight: 600 }}>{course.title}</div>
                          </Link>
                          <div className="row" style={{ padding: '6px 14px 14px', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <span className="faint" style={{ fontSize: 12 }}>{course.documentCount} document{course.documentCount === 1 ? '' : 's'}</span>
                            {course.documentHref && <a href={course.documentHref} download className="icon-dl" title={`Télécharger ${course.documentTitle}`} aria-label={`Télécharger le document ${course.documentTitle}`}><i className="ph ph-download-simple" style={{ fontSize: 18 }} /></a>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
      ) : (
        <div className="stack" style={{ border: '1px dashed var(--border-strong)', borderRadius: 12, padding: '48px 24px', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <i className="ph ph-hourglass-medium" style={{ fontSize: 40, color: '#FF8A65' }} />
          <div className="display" style={{ fontSize: 22, fontWeight: 600 }}>Le niveau {LEVELS[lvl].name} arrive bientôt</div>
          <div className="muted" style={{ fontSize: 15, maxWidth: 440 }}>Les cours sont en préparation. Ils apparaîtront ici dès leur publication.</div>
        </div>
      )}
    </section>
  );
}
