import { Link } from 'react-router-dom';

const LINKS = [
  { to: '/plan', label: 'Plan a trip' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/community', label: 'Community' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
];

/** A quiet row: the wordmark, a few links and the photo credits. */
export function Footer() {
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-24 px-16 py-40 md:px-40">
        <div>
          <p className="font-display text-[22px] text-ink" style={{ fontWeight: 500 }}>Routify</p>
          <p className="mt-8 text-[16px] text-muted">© {new Date().getFullYear()} Routify</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-24">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="footer-link text-[17px]">{l.label}</Link>
          ))}
        </nav>
        <p className="max-w-[60ch] text-[15px] text-muted">
          Photos from Wikimedia Commons (CC BY-SA): a mountain road in Khevi, Lerma, Hondarribia, the Château d'Amboise, Burgos Cathedral,
          Bordeaux's Place de la Bourse, the Grand-Place in Brussels and San Sebastián city hall.
        </p>
      </div>
    </footer>
  );
}
