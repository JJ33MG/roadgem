import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface MobileMenuProps {
  links: { to: string; label: string }[];
  onClose: () => void;
}

export function MobileMenu({ links, onClose }: MobileMenuProps) {
  const { user, logout } = useAuth();

  return (
    <div className="border-t border-lead/30 bg-deep-space md:hidden">
      <nav className="section flex flex-col gap-16 py-24">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className="nav-link text-body" onClick={onClose}>
            {link.label}
          </NavLink>
        ))}

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
