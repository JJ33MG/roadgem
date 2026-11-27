import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LINKS = [
  { to: '/plan', label: 'nav.plan' },
  { to: '/pricing', label: 'nav.pricing' },
  { to: '/community', label: 'nav.community' },
  { to: '/privacy', label: 'footer.privacy' },
  { to: '/terms', label: 'footer.terms' },
];

/** A quiet row: the wordmark, a few links and the photo credits. */
export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-rule bg-paper">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-24 px-16 py-40 md:px-40">
        <div>
          <p className="font-display text-[22px] text-ink" style={{ fontWeight: 500 }}>RoamGem</p>
          <p className="mt-8 text-[16px] text-muted">© {new Date().getFullYear()} RoamGem</p>
        </div>
        <nav aria-label={t('footer.label')} className="flex flex-wrap gap-24">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="footer-link text-[17px]">{t(l.label)}</Link>
          ))}
        </nav>
        <p className="max-w-[60ch] text-[15px] text-muted">
          {t('footer.credits')}
        </p>
      </div>
    </footer>
  );
}
