import type { CourseDocument } from '@prisma/client';

type FormAction = (formData: FormData) => Promise<void>;

type DocumentValues = {
  title: string;
  kind: CourseDocument['kind'];
  format: CourseDocument['format'];
  storageKey: string;
  sortOrder: number;
};

const ERRORS: Record<string, string> = {
  'invalid-title': 'Le titre est requis et doit comporter moins de 160 caractères.',
  'invalid-kind': 'Le type du document est invalide.',
  'invalid-format': 'Le format du document est invalide.',
  'invalid-storage-key': 'storageKey est requis et ne doit pas contenir ../.',
  'invalid-sort-order': 'L’ordre d’affichage doit être un entier supérieur ou égal à 0.',
  'course-not-found': 'Le cours demandé est introuvable.',
  'document-not-found': 'Le document demandé est introuvable.',
  'invalid-course-id': 'Identifiant de cours invalide.',
  'invalid-document-id': 'Identifiant de document invalide.',
  'duplicate-document': 'Ce document ne peut pas être créé à cause d’un conflit de données.',
};

export function DocumentForm({
  action,
  document,
  error,
}: {
  action: FormAction;
  document?: DocumentValues;
  error?: string;
}) {
  return (
    <form action={action} className="stack" style={{ gap: 18 }}>
      <label className="field">Titre
        <input className="input" name="title" required maxLength={160} defaultValue={document?.title} />
      </label>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <label className="field">Type
          <select className="input" name="kind" required defaultValue={document?.kind ?? 'PREPARATORY'}>
            <option value="PREPARATORY">Préparatoire</option>
            <option value="PRACTICAL">Pratique</option>
          </select>
        </label>
        <label className="field">Format
          <select className="input" name="format" required defaultValue={document?.format ?? 'PDF'}>
            <option value="PDF">PDF</option>
            <option value="HTML">HTML</option>
          </select>
        </label>
        <label className="field">Ordre d’affichage
          <input className="input mono" name="sortOrder" type="number" min={0} step={1} required defaultValue={document?.sortOrder ?? 0} />
        </label>
      </div>

      <label className="field">Référence de stockage
        <input className="input mono" name="storageKey" required maxLength={255} defaultValue={document?.storageKey} />
        <span className="faint" style={{ fontSize: 12 }}>Référence abstraite uniquement ; aucun fichier n’est téléchargé ou stocké dans cette étape.</span>
      </label>

      {error && <div className="msg-err" role="alert">{ERRORS[error] ?? 'Impossible de traiter le document.'}</div>}

      <button className="btn btn-primary" type="submit">{document ? 'Enregistrer les modifications' : 'Créer le document'}</button>
    </form>
  );
}
