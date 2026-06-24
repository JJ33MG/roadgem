import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
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
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-starlight/10 bg-deep-space/70 backdrop-blur">
      <div className="section flex items-center justify-between py-16">
        <Link to="/" className="font-display text-heading-sm font-w480 text-starlight">
          ROADGEM
        </Link>

        <nav className="hidden items-center gap-32 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className="nav-link text-body-sm">
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-12 md:flex">
          {user ? (
            <button onClick={logout} className="btn-header text-body-sm">
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link text-body-sm">
                Log in
              </Link>
              <Link to="/signup" className="btn-header text-body-sm">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          className="text-starlight md:hidden"
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
