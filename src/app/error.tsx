'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="stack" style={{ gap: 20, alignItems: 'flex-start' }}>
      <h1 className="h1">Une erreur est survenue</h1>
      <p className="lead">Impossible d’afficher cette page pour le moment.</p>
      <button onClick={reset} className="btn btn-primary"><i className="ph ph-arrow-clockwise" />Réessayer</button>
    </section>
  );
}
