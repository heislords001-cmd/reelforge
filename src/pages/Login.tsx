import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import { api, errorMessage, fetchAuthConfig } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Primitives';
import { GoogleButton } from '../components/auth/GoogleButton';
import { AuthAside } from '../components/auth/AuthAside';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: 'Google sign in did not complete. Try again.',
  google_email_unverified: 'That Google account does not have a verified email.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    fetchAuthConfig().then((cfg) => setGoogleEnabled(cfg.google));
  }, []);

  useEffect(() => {
    const code = params.get('error');
    if (code) setError(GOOGLE_ERROR_MESSAGES[code] ?? 'Something went wrong signing in.');
  }, [params]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await api.auth.login(email, password);
      setSession(user, token);
      navigate('/dashboard');
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in. Check your details and try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <AuthAside
        title="Welcome back to your studio."
        subtitle="Pick up where you left off. Your scripts, scenes, and narration are saved in your projects."
      />

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Link to="/" className="btn-ghost mb-6 -ml-3 inline-flex">
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-gradient shadow-glow lg:hidden">
              <Clapperboard className="text-white" size={20} />
            </span>
            <h1 className="text-2xl font-semibold">Welcome back</h1>
            <p className="text-sm text-ink-muted">Sign in to keep building your next video.</p>
          </div>

          <div className="glass-card space-y-4 p-6">
            {error && <p className="rounded-lg bg-ember-500/10 px-3 py-2 text-xs text-ember-400">{error}</p>}

            {googleEnabled && (
              <>
                <GoogleButton label="Continue with Google" />
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/[0.08]" />
                  <span className="text-[11px] text-ink-faint">or</span>
                  <div className="h-px flex-1 bg-white/[0.08]" />
                </div>
              </>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label-eyebrow mb-1.5 block">Email</label>
                <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" />
              </div>
              <div>
                <label className="label-eyebrow mb-1.5 block">Password</label>
                <input type="password" required className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Spinner /> : 'Sign in'}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-ink-muted lg:text-left">
            New to Reelbolt?{' '}
            <Link to="/register" className="font-medium text-signal-200 hover:text-signal-400">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
