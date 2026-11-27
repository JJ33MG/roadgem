import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useTranslation } from 'react-i18next';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('notFound.title'));
  return (
    <section className="mx-auto max-w-[640px] px-16 py-80 text-center">
      <h1 className="font-display text-[40px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.03em' }}>{t('notFound.title')}</h1>
      <p className="mt-12">{t('notFound.body')}</p>
      <div className="mt-24 flex flex-wrap justify-center gap-12">
        <Link to="/plan" className="btn-primary no-underline">{t('nav.plan')}</Link>
        <Link to="/" className="btn-header no-underline">{t('notFound.home')}</Link>
      </div>
    </section>
  );
}
