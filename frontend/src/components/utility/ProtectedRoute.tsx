import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

const ADMIN_EMAIL = 'mignonjarne9@gmail.com';

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.email !== ADMIN_EMAIL) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
