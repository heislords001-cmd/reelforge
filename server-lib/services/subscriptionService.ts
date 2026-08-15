import { query } from '../config/database';
import { paymentProvider } from '../providers/payment';
import { WebhookEvent } from '../providers/payment/types';
import { Plan, Subscription, User } from '../types';
import { logger } from '../utils/logger';

interface BillingStatus {
  plan: Plan;
  isPremiumActive: boolean;
  trialEndsAt: string;
  daysLeftInTrial: number;
  subscription: Subscription | null;
}

export const subscriptionService = {
  async getPlanFields(userId: string): Promise<Pick<User, 'plan' | 'trial_ends_at'>> {
    const { rows } = await query<Pick<User, 'plan' | 'trial_ends_at'>>(
      'SELECT plan, trial_ends_at FROM users WHERE id = $1',
      [userId]
    );
    if (!rows[0]) throw new Error('User not found');
    return rows[0];
  },

  /**
   * The single source of truth for "does this user currently get the premium model tier."
   * A trial counts as premium until it expires. No separate "trial" provider tier needed,
   * it just falls through to 'free' once trial_ends_at passes and there's no active sub.
   */
  isPremiumActive(user: Pick<User, 'plan' | 'trial_ends_at'>): boolean {
    if (user.plan === 'premium') return true;
    if (user.plan === 'trial') return new Date(user.trial_ends_at).getTime() > Date.now();
    return false;
  },

  /** Which registered script provider name a user's generation calls should use right now. */
  scriptProviderNameFor(user: Pick<User, 'plan' | 'trial_ends_at'>): string {
    return this.isPremiumActive(user) ? 'nvidia-premium' : 'nvidia-free';
  },

  /** Free tier stays on FLUX Schnell (commercially safe, no licensing concern). Premium
   *  gets Nano Banana, a genuinely stronger, paid model, the same free/premium split
   *  pattern as scripts, once a real commercially licensed option was available for images. */
  imageProviderNameFor(user: Pick<User, 'plan' | 'trial_ends_at'>): string {
    return this.isPremiumActive(user) ? 'nano-banana' : 'nvidia-flux-schnell';
  },

  async getBillingStatus(userId: string): Promise<BillingStatus> {
    const { rows } = await query<User>('SELECT plan, trial_ends_at FROM users WHERE id = $1', [userId]);
    const user = rows[0];
    if (!user) throw new Error('User not found');

    const { rows: subRows } = await query<Subscription>(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const msLeft = new Date(user.trial_ends_at).getTime() - Date.now();
    return {
      plan: user.plan,
      isPremiumActive: this.isPremiumActive(user),
      trialEndsAt: user.trial_ends_at,
      daysLeftInTrial: Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))),
      subscription: subRows[0] ?? null,
    };
  },

  /** Called right after a user's browser redirects back from Paystack checkout. Best-effort
   *  immediate UX. The webhook (handleWebhookEvent) is what's actually authoritative. */
  async confirmCheckout(userId: string, reference: string) {
    const verified = await paymentProvider.verifyTransaction(reference);
    if (!verified.success) return { activated: false };

    await query(
      `INSERT INTO subscriptions (user_id, provider, customer_code, plan_code, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [userId, paymentProvider.name, verified.customerCode, verified.planCode]
    );
    await query(`UPDATE users SET plan = 'premium', updated_at = now() WHERE id = $1`, [userId]);
    return { activated: true };
  },

  /** Idempotent webhook handler. Payment_events.UNIQUE(provider, event_id) makes a retried
   *  delivery a no-op instead of double-processing. */
  async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    const { rows: existing } = await query(
      'SELECT 1 FROM payment_events WHERE provider = $1 AND event_id = $2',
      [paymentProvider.name, event.id]
    );
    if (existing.length > 0) {
      logger.info('Skipping already-processed webhook event', { eventId: event.id, type: event.type });
      return;
    }

    const userId = await this.resolveUserId(event);
    if (!userId) {
      logger.warn('Could not resolve a user for webhook event. Recording and skipping', { type: event.type });
      await this.recordEvent(event);
      return;
    }

    switch (event.type) {
      case 'charge.success':
        await query(`UPDATE users SET plan = 'premium', updated_at = now() WHERE id = $1`, [userId]);
        await this.upsertSubscription(userId, event, 'active');
        break;

      case 'subscription.create':
        await this.upsertSubscription(userId, event, 'active');
        break;

      case 'subscription.not_renew':
      case 'subscription.disable':
        await this.upsertSubscription(userId, event, 'cancelled');
        await query(`UPDATE users SET plan = 'free', updated_at = now() WHERE id = $1`, [userId]);
        break;

      case 'invoice.payment_failed':
        await this.upsertSubscription(userId, event, 'past_due');
        break;

      default:
        logger.info('Unhandled Paystack event type (recorded, no action taken)', { type: event.type });
    }

    await this.recordEvent(event);
  },

  async resolveUserId(event: WebhookEvent): Promise<string | null> {
    if (event.metadataUserId) return event.metadataUserId;

    if (event.customerCode) {
      const { rows } = await query<{ user_id: string }>(
        'SELECT user_id FROM subscriptions WHERE customer_code = $1 ORDER BY created_at DESC LIMIT 1',
        [event.customerCode]
      );
      if (rows[0]) return rows[0].user_id;
    }
    if (event.subscriptionCode) {
      const { rows } = await query<{ user_id: string }>(
        'SELECT user_id FROM subscriptions WHERE subscription_code = $1 ORDER BY created_at DESC LIMIT 1',
        [event.subscriptionCode]
      );
      if (rows[0]) return rows[0].user_id;
    }
    if (event.email) {
      const { rows } = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [event.email]);
      if (rows[0]) return rows[0].id;
    }
    return null;
  },

  async upsertSubscription(userId: string, event: WebhookEvent, status: Subscription['status']) {
    const { rows } = await query<{ id: string }>(
      'SELECT id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (rows[0]) {
      await query(
        `UPDATE subscriptions
         SET status = $1,
             customer_code = COALESCE($2, customer_code),
             subscription_code = COALESCE($3, subscription_code),
             plan_code = COALESCE($4, plan_code),
             current_period_end = COALESCE($5, current_period_end),
             updated_at = now()
         WHERE id = $6`,
        [status, event.customerCode, event.subscriptionCode, event.planCode, event.currentPeriodEnd, rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO subscriptions (user_id, provider, customer_code, subscription_code, plan_code, status, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, paymentProvider.name, event.customerCode, event.subscriptionCode, event.planCode, status, event.currentPeriodEnd]
      );
    }
  },

  async recordEvent(event: WebhookEvent) {
    await query(
      `INSERT INTO payment_events (provider, event_id, event_type) VALUES ($1, $2, $3)
       ON CONFLICT (provider, event_id) DO NOTHING`,
      [paymentProvider.name, event.id, event.type]
    );
  },
};
