import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Spinner } from '../components/ui/Primitives';

export default function BillingCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'success' | 'failed'>('checking');

  useEffect(() => {
    // Paystack appends both "reference" and "trxref" with the same value. Either works.
    const reference = params.get('reference') ?? params.get('trxref');
    if (!reference) {
      setState('failed');
      return;
    }
    api.billing
      .verify(reference)
      .then((result) => setState(result.activated ? 'success' : 'failed'))
      .catch(() => setState('failed'));
  }, [params]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {state === 'checking' && (
        <>
          <Spinner className="mb-4 h-6 w-6 text-signal-400" />
          <p className="text-sm text-ink-muted">Confirming your payment…</p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2 className="mb-4 text-success" size={40} />
          <h1 className="mb-1.5 text-xl font-semibold">You're on premium</h1>
          <p className="mb-6 max-w-sm text-sm text-ink-muted">
            Higher-quality script generation is active on your account now.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Back to dashboard
          </button>
        </>
      )}
      {state === 'failed' && (
        <>
          <XCircle className="mb-4 text-ember-400" size={40} />
          <h1 className="mb-1.5 text-xl font-semibold">We couldn't confirm that payment</h1>
          <p className="mb-6 max-w-sm text-sm text-ink-muted">
            If you were charged, it will still activate shortly. Otherwise, try upgrading again.
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            Back to dashboard
          </button>
        </>
      )}
    </div>
  );
}
