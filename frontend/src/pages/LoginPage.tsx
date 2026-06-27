import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-16">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="mb-32 text-center">
          <Link to="/" className="font-display text-heading-sm font-w480 text-starlight">
            Routify
          </Link>
          <h1 className="mt-16 text-heading font-display font-w360 text-starlight">Welcome back</h1>
          <p className="mt-8 text-body-sm text-silver">Log in to your account to continue</p>
        </div>

        <div className="glass-panel">
          {error && (
            <div className="mb-24 rounded-container border border-red-500/30 bg-red-500/10 px-16 py-12">
              <p className="text-body-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-16">
            <div>
              <label htmlFor="email" className="mb-8 block text-body-sm text-silver">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-8 block text-body-sm text-silver">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary mt-8 w-full">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-24 text-center text-body-sm text-silver">
          Don't have an account?{' '}
          <Link to="/signup" className="font-w480 text-mercury-blue hover:underline">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
