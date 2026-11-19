import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/utility/AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
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
      navigate('/dashboard');
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
      footer={<>New to Routify? <Link to="/signup">Make an account</Link></>}
    />
  );
}
