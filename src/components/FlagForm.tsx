'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { submitFlag, type FlagState } from '@/app/actions';

const MESSAGES: Partial<Record<FlagState['status'], string>> = {
  err: 'Ce n’est pas le bon flag. Réessaie.',
  rate: 'Trop d’essais. Patiente une minute avant de réessayer.',
  missing: 'Ce défi n’est plus disponible.',
};

export default function FlagForm({ challengeId, loggedIn }: { challengeId: string; loggedIn: boolean }) {
  const [state, action, pending] = useActionState(submitFlag.bind(null, challengeId), { status: 'idle' });
  const [dirty, setDirty] = useState(false);
  useEffect(() => setDirty(false), [state.at]);

  if (!loggedIn || state.status === 'auth') {
    return (
      <Link href={`/connexion?next=/defis/${challengeId}`} className="btn btn-primary"><i className="ph ph-sign-in" />Connecte-toi pour soumettre</Link>
    );
  }
  const msg = dirty ? undefined : MESSAGES[state.status];
  return (
    <form action={action} className="stack" style={{ gap: 10 }}>
      <input name="flag" required autoComplete="off" spellCheck={false} placeholder="ESATIC{...}" aria-label="Flag" aria-invalid={!!msg}
        className={`input mono${msg ? ' err' : ''}`} onChange={() => setDirty(true)} />
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Vérification…' : 'Valider'}</button>
      {msg && <div className="msg-err" role="alert"><i className="ph ph-x-circle" />{msg}</div>}
    </form>
  );
}
