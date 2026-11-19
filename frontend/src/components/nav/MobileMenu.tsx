import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface MobileMenuProps {
  links: { to: string; label: string }[];
  onClose: () => void;
}

export function MobileMenu({ links, onClose }: MobileMenuProps) {
  const { user, logout } = useAuth();
  return (
    <div className="border-t border-rule bg-paper md:hidden">
      <nav aria-label="Main" className="flex flex-col px-16 py-8">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className="nav-link flex min-h-[52px] items-center border-b border-rule text-[19px] no-underline" onClick={onClose}>
            {l.label}
          </NavLink>
        ))}
        <div className="flex flex-col gap-12 py-16">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link text-[19px] no-underline" onClick={onClose}>My trips</Link>
              <button type="button" className="btn-header" onClick={() => { logout(); onClose(); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-header no-underline" onClick={onClose}>Log in</Link>
              <Link to="/signup" className="btn-primary no-underline" onClick={onClose}>Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
