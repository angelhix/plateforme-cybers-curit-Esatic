import type { Category, Course } from '@prisma/client';

type FormAction = (formData: FormData) => Promise<void>;

type ChallengeValues = {
  id: string;
  title: string;
  categoryCode: string;
  level: number;
  points: number;
  description: string;
  goal: string;
  command: string;
  output: string;
  courseId: string | null;
  published: boolean;
};

const ERRORS: Record<string, string> = {
  'invalid-id': 'Identifiant invalide. Utilise lettres, chiffres, tirets et underscores.',
  'invalid-fields': 'Vérifie le titre, la catégorie, le niveau et les points.',
  'required-fields': 'Tous les champs descriptifs sont requis.',
  'invalid-category': 'La catégorie sélectionnée est introuvable.',
  'invalid-course': 'Le cours sélectionné est introuvable.',
  'invalid-flag': 'Le flag est requis et ne doit pas dépasser 200 caractères.',
  'duplicate-id': 'Un défi avec cet identifiant existe déjà.',
  'immutable-id': 'L’identifiant d’un défi ne peut pas être modifié.',
};

export function ChallengeForm({
  action,
  categories,
  courses,
  challenge,
  error,
}: {
  action: FormAction;
  categories: Category[];
  courses: Pick<Course, 'id' | 'title' | 'level'>[];
  challenge?: ChallengeValues;
  error?: string;
}) {
  return (
    <form action={action} className="stack" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <label className="field">ID du défi
          <input className="input mono" name="id" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,39}" maxLength={40} defaultValue={challenge?.id} readOnly={!!challenge} />
        </label>
        <label className="field">Titre
          <input className="input" name="title" required maxLength={160} defaultValue={challenge?.title} />
        </label>
        <label className="field">Catégorie
          <select className="input" name="categoryCode" required defaultValue={challenge?.categoryCode ?? ''}>
            <option value="" disabled>Choisir une catégorie</option>
            {categories.map(category => <option key={category.code} value={category.code}>{category.code} · {category.name}</option>)}
          </select>
        </label>
        <label className="field">Niveau
          <select className="input" name="level" required defaultValue={challenge?.level ?? 1}>
            <option value={1}>1 · Débutant</option>
            <option value={2}>2 · Intermédiaire</option>
            <option value={3}>3 · Avancé</option>
          </select>
        </label>
        <label className="field">Points
          <input className="input mono" name="points" type="number" min={1} step={1} required defaultValue={challenge?.points ?? 50} />
        </label>
        <label className="field">Cours associé
          <select className="input" name="courseId" defaultValue={challenge?.courseId ?? ''}>
            <option value="">Aucun</option>
            {courses.map(course => <option key={course.id} value={course.id}>Niveau {course.level} · {course.title}</option>)}
          </select>
        </label>
      </div>

      <label className="field">Description
        <textarea className="input" name="description" required rows={3} defaultValue={challenge?.description} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>
      <label className="field">Objectif pédagogique
        <textarea className="input" name="goal" required rows={2} defaultValue={challenge?.goal} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>
      <label className="field">Commande de départ
        <textarea className="input mono" name="command" required rows={2} defaultValue={challenge?.command} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>
      <label className="field">Output attendu
        <textarea className="input mono" name="output" required rows={3} defaultValue={challenge?.output} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>
      <label className="field">{challenge ? 'Nouveau flag (facultatif)' : 'Flag'}
        <input className="input mono" name="flag" type="password" autoComplete="new-password" maxLength={200} required={!challenge} />
      </label>

      <label className="row" style={{ gap: 10, color: 'var(--text-2)', fontSize: 14 }}>
        <input type="checkbox" name="published" defaultChecked={challenge?.published ?? true} />
        Défi publié
      </label>

      {error && <div className="msg-err" role="alert">{ERRORS[error] ?? 'Impossible de traiter ce défi.'}</div>}
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="submit">{challenge ? 'Enregistrer les modifications' : 'Créer le défi'}</button>
      </div>
    </form>
  );
}