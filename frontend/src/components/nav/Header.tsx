import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MobileMenu } from './MobileMenu';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
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

  // On home page: transparent → white on scroll. On other pages: dark glass always.
  const transparent = isHome && !scrolled;

  const headerStyle = transparent
    ? 'bg-transparent border-transparent'
    : isHome
    ? 'bg-white/95 backdrop-blur-md border-[#ece8f5] shadow-sm'
    : 'bg-deep-space/70 backdrop-blur border-starlight/10';

  const logoColor = transparent || !isHome ? 'text-white' : 'text-[#0d0d14]';
  const navLinkColor = transparent || !isHome ? 'text-white/85 hover:text-white' : 'text-[#6b6878] hover:text-mercury-blue';
  const actionColor = transparent || !isHome ? 'text-white/85 hover:text-white' : 'text-[#6b6878] hover:text-mercury-blue';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${headerStyle}`}
    >
      <div className="section flex items-center justify-between py-16">
        <Link
          to="/"
          className={`font-display text-heading-sm font-w480 transition-colors ${logoColor}`}
        >
          ROADGEM
        </Link>

        <nav className="hidden items-center gap-32 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={`text-body-sm transition-colors ${navLinkColor}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-12 md:flex">
          {user ? (
            <button
              onClick={logout}
              className={`text-body-sm transition-colors ${actionColor}`}
            >
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className={`text-body-sm transition-colors ${actionColor}`}>
                Log in
              </Link>
              <Link
                to="/signup"
                className={
                  transparent
                    ? 'rounded-full border border-white/40 px-20 py-8 text-body-sm text-white transition-all hover:bg-white/15'
                    : isHome
                    ? 'rounded-full border-2 border-mercury-blue px-20 py-8 text-body-sm font-w480 text-mercury-blue transition-all hover:bg-mercury-blue hover:text-white'
                    : 'btn-header text-body-sm'
                }
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className={`transition-colors md:hidden ${transparent || !isHome ? 'text-white' : 'text-[#0d0d14]'}`}
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
