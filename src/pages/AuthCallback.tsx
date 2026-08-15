import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Primitives';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setFailed(true);
      return;
    }

    // api.auth.me() reads the token from localStorage via the request interceptor, so it
    // needs to be there before the call goes out.
    localStorage.setItem('reelforge_token', token);
    api.auth
      .me()
      .then((user) => {
        setSession(user, token);
        navigate('/dashboard');
      })
      .catch(() => setFailed(true));
  }, [params, navigate, setSession]);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <XCircle className="mb-4 text-ember-400" size={40} />
        <h1 className="mb-1.5 text-xl font-semibold">Sign in did not work</h1>
        <p className="mb-6 max-w-sm text-sm text-ink-muted">Try signing in again from the login page.</p>
        <button onClick={() => navigate('/login')} className="btn-secondary">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Spinner className="mb-4 h-6 w-6 text-signal-400" />
      <p className="text-sm text-ink-muted">Finishing sign in...</p>
    </div>
  );
}
