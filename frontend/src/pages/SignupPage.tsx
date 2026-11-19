import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/utility/AuthLayout';

export function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next');

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signup(email, password, name);
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Making the account did not work. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Make an account"
      intro="Free, and your first trip is saved for you."
      fields={[
        { id: 'name', label: 'Your name', type: 'text', autoComplete: 'name', value: name, onChange: setName },
        { id: 'email', label: 'Email', type: 'email', autoComplete: 'email', value: email, onChange: setEmail },
        { id: 'password', label: 'Password, at least 8 characters', type: 'password', autoComplete: 'new-password', value: password, onChange: setPassword, minLength: 8 },
      ]}
      submitLabel="Make my account"
      busyLabel="Making your account"
      busy={busy}
      error={error}
      onSubmit={submit}
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    />
  );
}
