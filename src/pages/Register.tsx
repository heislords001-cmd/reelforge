import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Primitives';
import { GoogleButton } from '../components/auth/GoogleButton';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await api.auth.register(email, password, name);
      setSession(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Try a different email.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-gradient shadow-glow">
            <Clapperboard className="text-white" size={20} />
          </span>
          <h1 className="text-xl font-semibold">Create your studio</h1>
          <p className="text-sm text-ink-muted">One idea in, a finished video package out.</p>
        </div>

        <div className="glass-card space-y-4 p-6">
          {error && <p className="rounded-lg bg-ember-500/10 px-3 py-2 text-xs text-ember-400">{error}</p>}

          <GoogleButton label="Sign up with Google" />

          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-white/[0.08]" />
            <span className="text-[11px] text-ink-faint">or</span>
            <div className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label-eyebrow mb-1.5 block">Name</label>
              <input required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Creator" />
            </div>
            <div>
              <label className="label-eyebrow mb-1.5 block">Email</label>
              <input
                type="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@studio.com"
              />
            </div>
            <div>
              <label className="label-eyebrow mb-1.5 block">Password</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Create account'}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-ink-faint">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="text-ink-muted hover:text-ink">
                Terms
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-ink-muted hover:text-ink">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-signal-200 hover:text-signal-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
