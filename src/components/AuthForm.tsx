'use client';

import { useActionState } from 'react';
import { login, register, type AuthState } from '@/app/actions';
import { LEVELS, LEVEL_IDS } from '@/lib/catalog';

export default function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'login' ? login : register, {});
  return (
    <form action={action} className="stack" style={{ gap: 16 }}>
      <input type="hidden" name="next" value={next} />
      <label className="field">Pseudo
        <input name="handle" className="input mono" required autoComplete="username" defaultValue={state.handle} placeholder="a_kouame" />
      </label>
      <label className="field">Mot de passe
        <input name="password" type="password" className="input" required minLength={mode === 'register' ? 8 : undefined}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </label>
      {mode === 'register' && (
        <label className="field">Ton niveau
          <select name="level" className="input" defaultValue="1" required>
            {LEVEL_IDS.map(l => <option key={l} value={l}>{LEVELS[l].dots} {LEVELS[l].name}</option>)}
          </select>
        </label>
      )}
      {state.error && <div className="msg-err" role="alert"><i className="ph ph-x-circle" />{state.error}</div>}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </button>
    </form>
  );
}
