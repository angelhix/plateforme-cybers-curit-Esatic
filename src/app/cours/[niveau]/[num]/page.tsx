import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { listChallenges } from '@/lib/data';
import { COURSES_PER_LEVEL, banner, docHref, getCourse, isLevel, type Level } from '@/lib/catalog';
import { prisma } from '@/lib/prisma';
import { completeArticleStep, submitCourseQuiz } from '../../actions';

type Params = Promise<{ niveau: string; num: string }>;
type CoursePageProps = { params: Params; searchParams: Promise<{ result?: string }> };

function resolve(niveau: string, num: string) {
  const n = Number(niveau);
  return isLevel(n) ? getCourse(n, Number(num) - 1) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { niveau, num } = await params;
  const level = Number(niveau), position = Number(num);
  if (isLevel(level) && Number.isInteger(position) && position > 0) {
    const course = await prisma.course.findFirst({ where: { level, position, published: true }, select: { title: true } });
    if (course) return { title: `${course.title} · Cours · Plateforme CTF ESATIC` };
  }
  const c = resolve(niveau, num);
  return { title: c ? `${c.title} · Cours · Plateforme CTF ESATIC` : 'Cours introuvable' };
}

const DOCS = [
  { label: 'Document préparatoire', sub: 'À lire avant de pratiquer · théorie et exemples', icon: 'ph-book-open-text', kind: 'Preparatoire' },
  { label: 'Travaux pratiques', sub: 'Exercices guidés sur le lab', icon: 'ph-terminal-window', kind: 'Pratique' },
] as const;

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const [{ niveau, num }, query] = await Promise.all([params, searchParams]);
  const level = Number(niveau), position = Number(num);
  const databaseCourse = isLevel(level) && Number.isInteger(position) && position > 0
    ? await prisma.course.findFirst({
      where: { level, position, published: true },
      select: {
        id: true,
        level: true,
        position: true,
        title: true,
        categoryCode: true,
        category: { select: { icon: true, color: true } },
        documents: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: { id: true, title: true, kind: true, format: true, storageKey: true },
        },
        steps: {
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            articleBody: true,
            questions: {
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                prompt: true,
                options: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, text: true } },
              },
            },
            challenge: { select: { id: true, title: true, published: true } },
          },
        },
      },
    })
    : null;
  const catalogueCourse = resolve(niveau, num);
  if (!databaseCourse && !catalogueCourse) notFound();
  const cur = databaseCourse ? {
    level: databaseCourse.level as Level,
    k: databaseCourse.position - 1,
    num: String(databaseCourse.position).padStart(2, '0'),
    title: databaseCourse.title,
    part: 1,
    catCode: databaseCourse.categoryCode,
    catIcon: databaseCourse.category.icon,
    catColor: databaseCourse.category.color,
    levelName: `Niveau ${databaseCourse.level}`,
    href: `/cours/${databaseCourse.level}/${String(databaseCourse.position).padStart(2, '0')}`,
  } : catalogueCourse!;
  const lvl = cur.level as Level;
  const me = await getCurrentUser();
  const related = (await listChallenges(me?.id ?? null)).filter(c => c.catCode === cur.catCode && c.level === lvl);
  const prev = getCourse(lvl, cur.k - 1), next = cur.k < COURSES_PER_LEVEL - 1 ? getCourse(lvl, cur.k + 1) : null;
  const completedSteps = databaseCourse && me
    ? new Set((await prisma.courseStepProgress.findMany({ where: { userId: me.id, step: { courseId: databaseCourse.id } }, select: { stepId: true } })).map(progress => progress.stepId))
    : new Set<string>();

  return (
    <section className="stack" style={{ gap: 32 }}>
      <div className="hero" style={{ background: banner(cur.catColor) }}>
        <Link href={`/cours?niveau=${lvl}`} className="back"><i className="ph ph-arrow-left" />Cours · {cur.levelName}</Link>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div className="hero-icon" style={{ width: 72, height: 72 }}><i className={`ph ${cur.catIcon}`} style={{ fontSize: 38, color: cur.catColor }} /></div>
          <div className="stack" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 12, letterSpacing: '.1em', color: cur.catColor }}>COURS {cur.num} · PARTIE {cur.part} · {cur.catCode}</span>
            <h1 className="h1" style={{ lineHeight: 1.1 }}>{cur.title}</h1>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack" style={{ gap: 16 }}>
          <h2 className="h3">Documents</h2>
          {databaseCourse ? databaseCourse.documents.map(document => {
            const href = `/${document.storageKey.split('/').map(encodeURIComponent).join('/')}`;
            return (
              <div key={document.id} className="row" style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 20, gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ph ${document.format === 'PDF' ? 'ph-file-pdf' : 'ph-file-html'}`} style={{ fontSize: 24, color: 'var(--cyan)' }} />
                </div>
                <div className="stack" style={{ flex: 1, minWidth: 180, gap: 2 }}>
                  <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{document.title}</span>
                  <span className="muted" style={{ fontSize: 14 }}>{document.kind === 'PREPARATORY' ? 'Document préparatoire' : 'Travaux pratiques'} · {document.format}</span>
                </div>
                <a href={href} target={document.format === 'HTML' ? '_blank' : undefined} rel={document.format === 'HTML' ? 'noopener noreferrer' : undefined} download={document.format === 'PDF'} className="btn btn-primary" style={{ height: 44, padding: '0 16px', fontSize: 14 }}>
                  <i className={`ph ${document.format === 'PDF' ? 'ph-download-simple' : 'ph-arrow-square-out'}`} style={{ fontSize: 18 }} />{document.format === 'PDF' ? 'PDF' : 'Lire'}
                </a>
              </div>
            );
          }) : DOCS.map(d => (
            <div key={d.kind} className="row" style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--surface)', padding: 20, gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ph ${d.icon}`} style={{ fontSize: 24, color: 'var(--cyan)' }} />
              </div>
              <div className="stack" style={{ flex: 1, minWidth: 180, gap: 2 }}>
                <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{d.label}</span>
                <span className="muted" style={{ fontSize: 14 }}>{d.sub}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={docHref(lvl, cur.k, d.kind, 'dc.html')} target="_blank" rel="noopener" className="btn btn-outline" style={{ height: 44, padding: '0 16px', fontSize: 14, fontWeight: 500 }}>
                  <i className="ph ph-book-open" style={{ fontSize: 18 }} />Lire
                </a>
                <a href={docHref(lvl, cur.k, d.kind, 'pdf')} download className="btn btn-primary" style={{ height: 44, padding: '0 16px', fontSize: 14 }}>
                  <i className="ph ph-file-pdf" style={{ fontSize: 18 }} />PDF
                </a>
              </div>
            </div>
          ))}
          {databaseCourse && !databaseCourse.documents.length && <div className="faint" style={{ fontSize: 14 }}>Aucun document n’est encore associé à ce cours.</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
            {prev ? <Link href={prev.href} className="pager-link"><i className="ph ph-arrow-left" />{prev.title}</Link> : <span />}
            {next ? <Link href={next.href} className="pager-link">{next.title}<i className="ph ph-arrow-right" /></Link> : <span />}
          </div>
        </div>

        <div className="stack" style={{ gap: 16 }}>
          <h2 className="h3">Mets-toi à l’épreuve</h2>
          {related.map(c => (
            <Link key={c.id} href={c.href} className="row mini-ch">
              <div style={{ width: 44, height: 44, borderRadius: 8, background: c.banner, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ph ${c.catIcon}`} style={{ fontSize: 22, color: c.catColor }} />
              </div>
              <div className="stack" style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{c.title}</span>
                <span className="mono faint" style={{ fontSize: 12 }}>{c.lvName} · {c.pts} pts</span>
              </div>
              <i className={`ph ${c.stIcon}`} style={{ fontSize: 20, color: c.stColor }} aria-label={c.stLabel} />
            </Link>
          ))}
          {!related.length && <div className="faint" style={{ fontSize: 14 }}>Pas encore de défi pour cette partie.</div>}
        </div>
      </div>

      {databaseCourse && databaseCourse.steps.length > 0 && (
        <section className="stack" style={{ gap: 16 }}>
          <h2 className="h3">Étapes du cours</h2>
          {query.result === 'quiz-correct' && <div className="row" role="status" style={{ border: '1px solid var(--green)', borderRadius: 8, padding: 12, color: 'var(--green)' }}>Toutes les réponses sont correctes. Étape terminée.</div>}
          {query.result === 'quiz-incorrect' && <div className="msg-err" role="alert">Certaines réponses sont incorrectes. Réessaie le quiz.</div>}
          {databaseCourse.steps.map((step, index) => {
            const completed = completedSteps.has(step.id);
            return (
              <article key={step.id} className="stack" style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', padding: 20, gap: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="mono faint" style={{ fontSize: 12 }}>ÉTAPE {index + 1} · {step.type}</span>
                    <h3 className="h3">{step.title}</h3>
                    {step.description && <p className="muted">{step.description}</p>}
                  </div>
                  {completed && <span className="pill" style={{ color: 'var(--green)' }}>Terminée</span>}
                </div>

                {step.type === 'ARTICLE' && step.articleBody && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{step.articleBody}</div>}
                {step.type === 'ARTICLE' && !completed && me && <form action={completeArticleStep.bind(null, databaseCourse.id, step.id)}><button className="btn btn-primary" type="submit">Marquer comme terminé</button></form>}
                {step.type === 'ARTICLE' && !completed && !me && <Link className="btn btn-outline" href={`/connexion?${new URLSearchParams({ next: cur.href })}`}>Connecte-toi pour valider cette étape</Link>}

                {step.type === 'QUIZ' && (me ? (
                  completed ? <span className="muted">Quiz réussi.</span> : step.questions.length ? (
                    <form action={submitCourseQuiz.bind(null, databaseCourse.id, step.id)} className="stack" style={{ gap: 18 }}>
                      {step.questions.map((question, questionIndex) => (
                        <fieldset key={question.id} className="stack" style={{ border: 0, padding: 0, gap: 10 }}>
                          <legend style={{ fontWeight: 600 }}>{questionIndex + 1}. {question.prompt}</legend>
                          {question.options.map(option => <label key={option.id} className="row" style={{ gap: 10 }}><input type="radio" name={`answer-${question.id}`} value={option.id} required /><span>{option.text}</span></label>)}
                        </fieldset>
                      ))}
                      <button className="btn btn-primary" type="submit">Vérifier mes réponses</button>
                    </form>
                  ) : <span className="muted">Ce quiz ne contient pas encore de questions.</span>
                ) : <Link className="btn btn-outline" href={`/connexion?${new URLSearchParams({ next: cur.href })}`}>Connecte-toi pour répondre au quiz</Link>)}

                {step.type === 'CHALLENGE' && step.challenge?.published && <Link className="btn btn-outline" href={`/defis/${encodeURIComponent(step.challenge.id)}`}>Ouvrir le défi · {step.challenge.title}</Link>}
                {step.type === 'CHALLENGE' && !step.challenge?.published && <span className="faint">Le défi associé n’est pas disponible.</span>}
              </article>
            );
          })}
        </section>
      )}
    </section>
  );
}
