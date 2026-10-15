'use client';

import { deleteChallenge } from '@/app/admin/challenges/actions';

export default function AdminChallengeDeleteButton({ id, title }: { id: string; title: string }) {
  return (
    <form action={deleteChallenge} onSubmit={event => {
      if (!window.confirm(`Supprimer le défi « ${title} » ? Cette action est définitive.`)) event.preventDefault();
    }}>
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-outline" type="submit" style={{ height: 36, padding: '0 12px', color: 'var(--danger)' }}>
        <i className="ph ph-trash" aria-hidden="true" />Supprimer
      </button>
    </form>
  );
}