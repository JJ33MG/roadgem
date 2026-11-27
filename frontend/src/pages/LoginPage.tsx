import { usePageTitle } from '@/hooks/usePageTitle';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/utility/AuthLayout';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.logIn'));
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
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      intro={t('auth.loginIntro')}
      fields={[
        { id: 'email', label: t('auth.email'), type: 'email', autoComplete: 'email', value: email, onChange: setEmail },
        { id: 'password', label: t('auth.password'), type: 'password', autoComplete: 'current-password', value: password, onChange: setPassword },
      ]}
      submitLabel={t('nav.logIn')}
      busyLabel={t('auth.loggingIn')}
      busy={busy}
      error={error}
      onSubmit={submit}
      footer={<>{t('auth.newHere')} <Link to={safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : '/signup'}>{t('auth.makeAccountLink')}</Link></>}
    />
  );
}
