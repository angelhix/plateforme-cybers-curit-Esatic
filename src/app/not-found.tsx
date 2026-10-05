import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="stack" style={{ gap: 20, alignItems: 'flex-start' }}>
      <div className="term" style={{ width: '100%', maxWidth: 560 }}>
        <div className="term-body">
          <div><span className="p">$</span> cat page.txt</div>
          <div className="o">cat: page.txt: No such file or directory</div>
        </div>
      </div>
      <h1 className="h1">Page introuvable</h1>
      <Link href="/" className="btn btn-primary"><i className="ph ph-house" />Retour à l’accueil</Link>
    </section>
  );
}
