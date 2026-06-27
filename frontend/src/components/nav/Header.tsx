import { Link, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Gem } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MobileMenu } from './MobileMenu';
import { SubmitGemModal } from '@/components/community/SubmitGemModal';

const NAV_LINKS = [
  { to: '/destinations', label: 'Destinations' },
  { to: '/templates', label: 'Trips' },
  { to: '/community', label: 'Community' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/dashboard', label: 'Dashboard' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gemModalOpen, setGemModalOpen] = useState(false);
  const { user, logout } = useAuth();

  const headerStyle = 'bg-[#080c14]/80 backdrop-blur border-white/10';

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${headerStyle}`}>
        <div className="section flex items-center justify-between py-16">
          <Link to="/" className="flex items-center gap-10 font-display text-heading-sm font-w480 text-white">
            <div className="h-8 w-8 rounded-full bg-[#f5a623]" />
            Routify
          </Link>

          <nav className="hidden items-center gap-32 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to}
                className="text-body-sm text-white/70 transition-colors hover:text-white">
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-12 md:flex">
            {/* Share a gem CTA — always visible */}
            <button
              onClick={() => setGemModalOpen(true)}
              className="flex items-center gap-6 rounded-full border border-[#f5a623]/40 px-16 py-8 text-body-sm text-[#f5a623] transition-all hover:border-[#f5a623] hover:bg-[#f5a623]/10"
            >
              <Gem size={13} /> Share a gem
            </button>

            {user ? (
              <button onClick={logout} className="text-body-sm text-white/70 transition-colors hover:text-white">
                Log out
              </button>
            ) : (
              <>
                <Link to="/login" className="text-body-sm text-white/70 transition-colors hover:text-white">
                  Log in
                </Link>
                <Link to="/signup"
                  className="rounded-full bg-[#f5a623] px-20 py-8 text-body-sm font-w480 text-[#080c14] transition-all hover:bg-[#f5a623]/90">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button className="text-white transition-colors md:hidden" aria-label="Toggle menu"
            onClick={() => setIsMobileMenuOpen((open) => !open)}>
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <MobileMenu links={NAV_LINKS} onClose={() => setIsMobileMenuOpen(false)} onShareGem={() => setGemModalOpen(true)} />
        )}
      </header>

      <SubmitGemModal isOpen={gemModalOpen} onClose={() => setGemModalOpen(false)} />
    </>
  );
}
