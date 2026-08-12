import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Primitives';

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

        <form onSubmit={onSubmit} className="glass-card space-y-4 p-6">
          {error && <p className="rounded-lg bg-ember-500/10 px-3 py-2 text-xs text-ember-400">{error}</p>}
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
        </form>

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
