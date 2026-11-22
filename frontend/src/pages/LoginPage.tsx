import { usePageTitle } from '@/hooks/usePageTitle';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/utility/AuthLayout';

export function LoginPage() {
  usePageTitle('Log in');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(safeNext ?? '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logging in did not work. Check your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      intro="Log in to see your saved trips."
      fields={[
        { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', value: email, onChange: setEmail },
        { id: 'password', label: 'Password', type: 'password', autoComplete: 'current-password', value: password, onChange: setPassword },
      ]}
      submitLabel="Log in"
      busyLabel="Logging in"
      busy={busy}
      error={error}
      onSubmit={submit}
      footer={<>New to Routify? <Link to={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : '/signup'}>Make an account</Link></>}
    />
  );
}
