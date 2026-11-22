import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <section className="mx-auto max-w-[640px] px-16 py-80 text-center">
      <h1 className="font-display text-[40px] text-ink" style={{ fontWeight: 400, letterSpacing: '-0.03em' }}>Page not found</h1>
      <p className="mt-12">This page is not here. Plan a trip, or go back to the start.</p>
      <div className="mt-24 flex flex-wrap justify-center gap-12">
        <Link to="/plan" className="btn-primary no-underline">Plan a trip</Link>
        <Link to="/" className="btn-header no-underline">Home</Link>
      </div>
    </section>
  );
}
