'use client';

import { useMemo, useState } from 'react';
import type { Challenge, CourseStepType } from '@prisma/client';

type FormAction = (formData: FormData) => Promise<void>;

type QuestionInput = {
  prompt: string;
  points: number;
  sortOrder: number;
  options: Array<{ id: string; text: string }>;
  correctIndex: number;
};

type CourseStepValues = {
  id?: string;
  title: string;
  type: CourseStepType;
  description: string;
  sortOrder: number;
  articleBody: string;
  challengeId: string | null;
  questions: QuestionInput[];
};

const ERRORS: Record<string, string> = {
  'invalid-course-id': 'Identifiant de cours invalide.',
  'course-not-found': 'Le cours demandé est introuvable.',
  'invalid-step-id': 'Identifiant d’étape invalide.',
  'step-not-found': 'L’étape demandée est introuvable.',
  'invalid-title': 'Le titre est requis.',
  'invalid-type': 'Le type d’étape est invalide.',
  'invalid-sort-order': 'L’ordre doit être un entier supérieur ou égal à zéro.',
  'invalid-article-body': 'Le contenu de l’article est requis.',
  'invalid-challenge': 'Le défi sélectionné est invalide ou introuvable.',
  'challenge-in-use': 'Ce défi est déjà associé à une autre étape.',
  'invalid-quiz': 'Un quiz doit contenir au moins une question.',
  'invalid-question-prompt': 'Chaque question doit avoir un énoncé.',
  'invalid-question-options': 'Chaque question doit avoir au moins deux options.',
  'invalid-question-answer': 'Chaque question doit avoir exactement une bonne réponse.',
  'invalid-question-points': 'Chaque question doit avoir au moins un point.',
  'invalid-question-sort-order': 'L’ordre des questions doit être un entier positif.',
  'duplicate-question-option': 'Les options d’une question ne doivent pas être dupliquées.',
  'duplicate-sort-order': 'Cet ordre est déjà utilisé dans ce cours.',
  'not-found': 'L’étape demandée est introuvable.',
};

function createQuestion(): QuestionInput {
  return {
    prompt: '',
    points: 1,
    sortOrder: 0,
    options: [
      { id: crypto.randomUUID(), text: '' },
      { id: crypto.randomUUID(), text: '' },
    ],
    correctIndex: 0,
  };
}

export function CourseStepForm({
  action,
  courseId,
  courseTitle,
  challenges,
  step,
  error,
}: {
  action: FormAction;
  courseId: string;
  courseTitle: string;
  challenges: Pick<Challenge, 'id' | 'title' | 'level' | 'points'>[];
  step?: CourseStepValues;
  error?: string;
}) {
  const initialType = step?.type ?? 'ARTICLE';
  const [type, setType] = useState<CourseStepType>(initialType);
  const [questions, setQuestions] = useState<QuestionInput[]>(step?.questions.length ? step.questions : [createQuestion()]);

  const challengeOptions = useMemo(() => challenges, [challenges]);

  function updateQuestion(index: number, field: keyof QuestionInput, value: string | number) {
    setQuestions(current => current.map((question, questionIndex) => {
      if (questionIndex !== index) return question;
      if (field === 'prompt') return { ...question, prompt: String(value) };
      if (field === 'points') return { ...question, points: Math.max(1, Number(value) || 1) };
      if (field === 'sortOrder') return { ...question, sortOrder: Math.max(0, Number(value) || 0) };
      return question;
    }));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions(current => current.map((question, index) => {
      if (index !== questionIndex) return question;
      return { ...question, options: question.options.map((option, optionNumber) => optionNumber === optionIndex ? { ...option, text: value } : option) };
    }));
  }

  function setCorrectOption(questionIndex: number, optionIndex: number) {
    setQuestions(current => current.map((question, index) => index === questionIndex ? { ...question, correctIndex: optionIndex } : question));
  }

  function addOption(questionIndex: number) {
    setQuestions(current => current.map((question, index) => {
      if (index !== questionIndex) return question;
      return { ...question, options: [...question.options, { id: crypto.randomUUID(), text: '' }] };
    }));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions(current => current.map((question, index) => {
      if (index !== questionIndex) return question;
      if (question.options.length <= 2) return question;
      const options = question.options.filter((_, optionNumber) => optionNumber !== optionIndex);
      const correctIndex = question.correctIndex >= options.length ? 0 : question.correctIndex;
      return { ...question, options, correctIndex };
    }));
  }

  function addQuestion() {
    setQuestions(current => [...current, createQuestion()]);
  }

  function removeQuestion(questionIndex: number) {
    setQuestions(current => current.length <= 1 ? current : current.filter((_, index) => index !== questionIndex));
  }

  function getQuestionEntries() {
    return questions.map((question, questionIndex) => ({
      ...question,
      sortOrder: question.sortOrder || questionIndex,
      options: question.options.map((option, optionIndex) => ({
        text: option.text,
        sortOrder: optionIndex,
      })),
    }));
  }

  return (
    <form action={action} className="stack" style={{ gap: 18 }}>
      <input type="hidden" name="courseId" value={courseId} />
      {step && <input type="hidden" name="stepId" value={step.id} />}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <label className="field">Type d’étape
          <select className="input" name="type" required value={type} onChange={event => setType(event.target.value as CourseStepType)}>
            <option value="ARTICLE">ARTICLE</option>
            <option value="QUIZ">QUIZ</option>
            <option value="CHALLENGE">CHALLENGE</option>
          </select>
        </label>

        <label className="field">Titre
          <input className="input" name="title" required maxLength={160} defaultValue={step?.title} />
        </label>

        <label className="field">Ordre
          <input className="input mono" name="sortOrder" type="number" min={0} step={1} required defaultValue={step?.sortOrder ?? 0} />
        </label>
      </div>

      <label className="field">Description
        <textarea className="input" name="description" rows={3} defaultValue={step?.description} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
      </label>

      {type === 'ARTICLE' && (
        <label className="field">Contenu pédagogique
          <textarea className="input" name="articleBody" required rows={10} defaultValue={step?.articleBody} style={{ height: 'auto', padding: 12, resize: 'vertical' }} />
        </label>
      )}

      {type === 'QUIZ' && (
        <div className="stack" style={{ gap: 16 }}>
          <div className="section-head">
            <div className="stack" style={{ gap: 4 }}>
              <span className="kicker">QUIZ</span>
              <h2 className="h2">Questions</h2>
            </div>
            <button className="btn btn-outline" type="button" onClick={addQuestion}><i className="ph ph-plus" aria-hidden="true" />Ajouter une question</button>
          </div>

          {questions.map((question, questionIndex) => (
            <div key={questionIndex} className="card" style={{ padding: 20, gap: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 12 }}>
                <h3 className="h3">Question {questionIndex + 1}</h3>
                {questions.length > 1 && <button className="btn btn-outline" type="button" onClick={() => removeQuestion(questionIndex)} style={{ height: 36, padding: '0 12px', color: 'var(--danger)' }}>Supprimer</button>}
              </div>

              <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 120px 120px', gap: 12 }}>
                <label className="field">Énoncé
                  <input className="input" name={`question-${questionIndex}-prompt`} required value={question.prompt} onChange={event => updateQuestion(questionIndex, 'prompt', event.target.value)} />
                </label>
                <label className="field">Points
                  <input className="input mono" name={`question-${questionIndex}-points`} type="number" min={1} step={1} required value={question.points} onChange={event => updateQuestion(questionIndex, 'points', Number(event.target.value))} />
                </label>
                <label className="field">Ordre
                  <input className="input mono" name={`question-${questionIndex}-sortOrder`} type="number" min={0} step={1} required value={question.sortOrder} onChange={event => updateQuestion(questionIndex, 'sortOrder', Number(event.target.value))} />
                </label>
              </div>

              <div className="stack" style={{ gap: 10 }}>
                {question.options.map((option, optionIndex) => (
                  <div key={option.id} className="row" style={{ gap: 10 }}>
                    <label className="row" style={{ gap: 8, flex: '0 0 auto' }}>
                      <input type="radio" name={`question-${questionIndex}-correct`} value={optionIndex} checked={question.correctIndex === optionIndex} onChange={() => setCorrectOption(questionIndex, optionIndex)} />
                      <span className="faint">Bonne réponse</span>
                    </label>
                    <input className="input" name={`question-${questionIndex}-option-${optionIndex}`} required value={option.text} onChange={event => updateOption(questionIndex, optionIndex, event.target.value)} />
                    {question.options.length > 2 && <button className="btn btn-outline" type="button" onClick={() => removeOption(questionIndex, optionIndex)} style={{ width: 42, padding: 0 }}><i className="ph ph-x" aria-hidden="true" /></button>}
                  </div>
                ))}
                <button className="btn btn-outline" type="button" onClick={() => addOption(questionIndex)} style={{ width: 'fit-content' }}><i className="ph ph-plus" aria-hidden="true" />Ajouter une option</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {type === 'CHALLENGE' && (
        <div className="stack" style={{ gap: 12 }}>
          <label className="field">Défi
            <select className="input" name="challengeId" required defaultValue={step?.challengeId ?? ''}>
              <option value="" disabled>Choisir un défi existant</option>
              {challengeOptions.map(challenge => (
                <option key={challenge.id} value={challenge.id}>#{challenge.id} · N{challenge.level} · {challenge.title} ({challenge.points} points)</option>
              ))}
            </select>
          </label>
          <p className="lead" style={{ fontSize: 13 }}>Le défi sélectionné restera associé à cette étape sans dupliquer ses informations.</p>
        </div>
      )}

      {error && <div className="msg-err" role="alert">{ERRORS[error] ?? 'Impossible de traiter cette étape.'}</div>}

      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" type="submit">{step ? 'Enregistrer les modifications' : `Créer l’étape · ${courseTitle}`}</button>
      </div>

      <input type="hidden" name="questions" value={JSON.stringify(getQuestionEntries())} />
    </form>
  );
}
