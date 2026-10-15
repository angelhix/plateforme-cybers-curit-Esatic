import type { Category, Course } from '@prisma/client';

type FormAction = (formData: FormData) => Promise<void>;

type CourseValues = {
  title: string;
  description: string;
  categoryCode: string;
  level: number;
  position: number;
  published: boolean;
};

const ERRORS: Record<string, string> = {
  'invalid-title': 'Le titre du cours est requis.',
  'invalid-description': 'La description du cours est requise.',
  'invalid-category': 'La catégorie sélectionnée est introuvable.',
  'invalid-level': 'Le niveau doit être 1, 2 ou 3.',
  'invalid-position': 'La position doit être un nombre supérieur à zéro.',
  'duplicate-position': 'Cette combinaison niveau/position existe déjà.',
  'not-found': 'Le cours demandé est introuvable.',
  'invalid-id': 'Identifiant de cours invalide.',
  'has-associations': 'Ce cours possède des documents, des défis ou des étapes associés. Supprimez d’abord ces éléments.',
};

export function CourseForm({
  action,
  categories,
  course,
  error,
  counts,
}: {
  action: FormAction;
  categories: Pick<Category, 'code' | 'name'>[];
  course?: CourseValues;
  error?: string;
  counts?: { documents: number; challenges: number };
}) {
  return (
    <form action={action} className="stack" style={{ gap: 18 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <label className="field">Titre
          <input className="input" name="title" required maxLength={160} defaultValue={course?.title} />
        </label>
        <label className="field">Catégorie
          <select className="input" name="categoryCode" required defaultValue={course?.categoryCode ?? ''}>
            <option value="" disabled>Choisir une catégorie</option>
            {categories.map(category => <option key={category.code} value={category.code}>{category.code} · {category.name}</option>)}
          </select>
        </label>
        <label className="field">Niveau
          <select className="input" name="level" required defaultValue={course?.level ?? 1}>
            <option value={1}>1 · Débutant</option>
            <option value={2}>2 · Intermédiaire</option>
            <option value={3}>3 · Avancé</option>
          </select>
        </label>
        <label className="field">Position
          <input className="input mono" name="position" type="number" min={1} step={1} required defaultValue={course?.position ?? 1} />
        </label>
      </div>

      <label className="field">Description
        <textarea className="input" name="description" required rows={4} defaultValue={course?.description} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>

      <label className="row" style={{ gap: 10, color: 'var(--text-2)', fontSize: 14 }}>
        <input type="checkbox" name="published" defaultChecked={course?.published ?? true} />
        Publier ce cours
      </label>

      {counts && (
        <div className="row" style={{ gap: 20, flexWrap: 'wrap', color: 'var(--text-2)', fontSize: 14 }}>
          <span><strong>{counts.documents}</strong> document{counts.documents === 1 ? '' : 's'}</span>
          <span><strong>{counts.challenges}</strong> défi{counts.challenges === 1 ? '' : 's'}</span>
        </div>
      )}

      {error && <div className="msg-err" role="alert">{ERRORS[error] ?? 'Impossible de traiter ce cours.'}</div>}

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="submit">{course ? 'Enregistrer les modifications' : 'Créer le cours'}</button>
      </div>
    </form>
  );
}
