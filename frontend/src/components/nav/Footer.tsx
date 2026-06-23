import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { to: '/plan', label: 'Plan a trip' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Log in' },
      { to: '/signup', label: 'Sign up — free' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-starlight/10 bg-deep-space">
      <div className="section grid gap-40 py-56 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-8">
            <MapPin size={18} className="text-mercury-blue" />
            <p className="font-display text-heading-sm font-w480 text-starlight">ROADGEM</p>
          </div>
          <p className="mt-12 max-w-xs text-body-sm text-silver">
            Curated road trip planning. From destination research to day-by-day itineraries, built for explorers.
          </p>
        </div>

        {FOOTER_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-body-sm font-w480 text-starlight">{section.title}</p>
            <ul className="mt-12 flex flex-col gap-8">
              {section.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="footer-link text-body-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="section flex flex-col gap-8 border-t border-starlight/10 py-20 font-mono text-caption uppercase tracking-widest text-silver sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} ROADGEM &mdash; All rights reserved</p>
        <p className="text-mercury-blue/70">On the road &middot; No destination too far</p>
      </div>
    </footer>
  );
}
