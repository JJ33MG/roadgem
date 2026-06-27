import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MobileMenu } from './MobileMenu';

const NAV_LINKS = [
  { to: '/plan', label: 'Plan a trip' },
  { to: '/destinations', label: 'Destinations' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/dashboard', label: 'Dashboard' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  // Always dark on non-home pages
  const headerStyle = 'bg-[#080c14]/80 backdrop-blur border-white/10';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${headerStyle}`}
    >
      <div className="section flex items-center justify-between py-16">
        <Link
          to="/"
          className="flex items-center gap-10 font-display text-heading-sm font-w480 text-white"
        >
          <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
          Routify
        </Link>

        <nav className="hidden items-center gap-32 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className="text-body-sm text-white/70 transition-colors hover:text-white"
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-12 md:flex">
          {user ? (
            <button onClick={logout} className="text-body-sm text-white/70 transition-colors hover:text-white">
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className="text-body-sm text-white/70 transition-colors hover:text-white">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-[#f5a623] px-20 py-8 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="text-white transition-colors md:hidden"
          aria-label="Toggle menu"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <MobileMenu links={NAV_LINKS} onClose={() => setIsMobileMenuOpen(false)} />
      )}
    </header>
  );
}
