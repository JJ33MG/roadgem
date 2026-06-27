import { NavLink, Link } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface MobileMenuProps {
  links: { to: string; label: string }[];
  onClose: () => void;
  onShareGem?: () => void;
}

export function MobileMenu({ links, onClose, onShareGem }: MobileMenuProps) {
  const { user, logout } = useAuth();

  return (
    <div className="border-t border-lead/30 bg-deep-space md:hidden">
      <nav className="section flex flex-col gap-16 py-24">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className="nav-link text-body" onClick={onClose}>
            {link.label}
          </NavLink>
        ))}

        {onShareGem && (
          <button onClick={() => { onShareGem(); onClose(); }}
            className="flex items-center gap-8 rounded-full border border-[#f5a623]/40 px-16 py-10 text-sm text-[#f5a623]">
            <Gem size={14} /> Share a gem
          </button>
        )}

        <div className="mt-16 flex flex-col gap-12 border-t border-lead/30 pt-16">
          {user ? (
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="btn-header text-center"
            >
              Log out
            </button>
          ) : (
            <>
              <Link to="/login" className="nav-link" onClick={onClose}>
                Log in
              </Link>
              <Link to="/signup" className="btn-header text-center" onClick={onClose}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
