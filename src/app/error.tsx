'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="stack" style={{ gap: 20, alignItems: 'flex-start' }}>
      <div className="term" style={{ width: '100%', maxWidth: 560 }}>
        <div className="term-body">
          <div><span className="p">$</span> ./plateforme</div>
          <div className="o" style={{ color: 'var(--danger)' }}>Segmentation fault (core dumped)</div>
        </div>
      </div>
      <h1 className="h1">Une erreur est survenue</h1>
      <button onClick={reset} className="btn btn-primary"><i className="ph ph-arrow-clockwise" />Réessayer</button>
    </section>
  );
}
