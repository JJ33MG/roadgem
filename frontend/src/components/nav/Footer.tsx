import { Link } from 'react-router-dom';

const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { to: '/plan', label: 'Plan a trip' },
      { to: '/destinations', label: 'Destinations' },
      { to: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/signup', label: 'Sign up — free' },
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080c14]">
      <div className="section grid gap-40 py-56 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-10">
            <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
            <p className="font-display text-heading-sm font-w480 text-white">Routify</p>
          </div>
          <p className="mt-12 max-w-xs text-body-sm text-white/50">
            AI-powered European road trip planning. Hidden gems, curated stays, and full itineraries — in 30 seconds.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-body-sm font-w480 text-white">{section.title}</p>
            <ul className="mt-12 flex flex-col gap-8">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-body-sm text-white/50 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="section flex flex-col gap-8 border-t border-white/10 py-20 font-mono text-caption uppercase tracking-widest text-white/30 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} Routify &mdash; All rights reserved</p>
        <p className="text-[#f5a623]/50">Discover Europe · One road at a time</p>
      </div>
    </footer>
  );
}
