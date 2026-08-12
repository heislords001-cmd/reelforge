import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { BillingStatus } from '../../lib/types';
import { Spinner } from '../ui/Primitives';

export function TrialBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.billing.status().then(setStatus).catch(() => {});
  }, []);

  async function upgrade() {
    setError(null);
    setRedirecting(true);
    try {
      const { authorizationUrl } = await api.billing.startCheckout();
      window.location.href = authorizationUrl;
    } catch (err) {
      setError(errorMessage(err, "Couldn't start checkout. Try again in a moment."));
      setRedirecting(false);
    }
  }

  if (!status || status.plan === 'premium') return null;

  const trialActive = status.plan === 'trial' && status.daysLeftInTrial > 0;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-signal-500/25 bg-signal-500/[0.06] px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <Sparkles size={15} className="text-signal-400" />
        <p className="text-sm text-ink">
          {trialActive ? (
            <>
              <span className="font-medium">{status.daysLeftInTrial} day{status.daysLeftInTrial === 1 ? '' : 's'} left</span>{' '}
              in your free trial. Premium quality generation, no card needed yet.
            </>
          ) : (
            <>Your free trial has ended. Upgrade to keep the premium model quality.</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {error && <span className="text-xs text-ember-400">{error}</span>}
        <button onClick={upgrade} disabled={redirecting} className="btn-primary !px-4 !py-2 text-xs">
          {redirecting ? <Spinner /> : 'Upgrade for $10/mo'}
        </button>
      </div>
    </div>
  );
}
