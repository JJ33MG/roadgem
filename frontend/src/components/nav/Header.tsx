import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MobileMenu } from './MobileMenu';

export const NAV_LINKS = [
  { to: '/plan', label: 'Plan a trip' },
  { to: '/destinations', label: 'Gems' },
  { to: '/community', label: 'Community' },
  { to: '/pricing', label: 'Pricing' },
];

/** Edge-aligned: the wordmark, four links, one action. */
export function Header() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-24 px-16 py-12 md:px-40">
        <Link to="/" className="font-display text-[24px] text-ink no-underline" style={{ fontWeight: 500, letterSpacing: '-0.02em' }}>
          Routify
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-[28px] md:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link text-[17px] no-underline ${isActive ? 'underline decoration-accent' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-12 md:flex">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link text-[17px] no-underline">My trips</Link>
              <button type="button" onClick={logout} className="btn-header">Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link text-[17px] no-underline">Log in</Link>
              <Link to="/signup" className="btn-header no-underline">Sign up</Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="flex h-[48px] w-[48px] items-center justify-center rounded-btn border border-rule text-ink md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </div>
      {open && <MobileMenu links={NAV_LINKS} onClose={() => setOpen(false)} />}
    </header>
  );
}
