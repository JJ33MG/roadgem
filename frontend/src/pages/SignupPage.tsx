import { usePageTitle } from '@/hooks/usePageTitle';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AuthLayout } from '@/components/utility/AuthLayout';
import { useTranslation } from 'react-i18next';

export function SignupPage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.signUp'));
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next');
  // Signed up through a friend's invite link: 2 weeks of Plus.
  const invite = params.get('invite')?.trim() || undefined;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await signup(email, password, name, invite);
      navigate(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signupFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t('auth.signupTitle')}
      intro={invite ? t('auth.signupIntroInvite') : t('auth.signupIntro')}
      fields={[
        { id: 'name', label: t('auth.yourName'), type: 'text', autoComplete: 'name', value: name, onChange: setName },
        { id: 'email', label: t('auth.email'), type: 'email', autoComplete: 'email', value: email, onChange: setEmail },
        { id: 'password', label: t('auth.newPassword'), type: 'password', autoComplete: 'new-password', value: password, onChange: setPassword, minLength: 8 },
      ]}
      submitLabel={t('auth.makeMyAccount')}
      busyLabel={t('auth.makingAccount')}
      busy={busy}
      error={error}
      onSubmit={submit}
      footer={<>{t('auth.haveAccount')} <Link to="/login">{t('nav.logIn')}</Link></>}
    />
  );
}
