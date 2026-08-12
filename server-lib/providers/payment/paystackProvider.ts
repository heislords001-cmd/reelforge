import crypto from 'crypto';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { CheckoutSession, PaymentProvider, VerifiedTransaction, WebhookEvent } from './types';

const PAYSTACK_BASE = 'https://api.paystack.co';

export class PaystackProvider implements PaymentProvider {
  readonly name = 'paystack';

  async initializeCheckout(input: { email: string; userId: string; callbackUrl: string }): Promise<CheckoutSession> {
    if (!env.paystack.secretKey) throw ApiError.internal('PAYSTACK_SECRET_KEY is not configured on the server');
    if (!env.paystack.planCode) throw ApiError.internal('PAYSTACK_PLAN_CODE is not configured on the server');

    const data = await withRetry(async () => {
      const response = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.paystack.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: input.email,
          // Paystack wants the smallest currency unit (kobo for NGN, cents for USD).
          amount: Math.round(env.paystack.amount * 100),
          currency: env.paystack.currency,
          plan: env.paystack.planCode,
          callback_url: input.callbackUrl,
          metadata: { userId: input.userId },
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw ApiError.upstream(`Paystack initialize failed (${response.status})`, body);
      }
      return (await response.json()) as {
        status: boolean;
        data: { authorization_url: string; reference: string };
      };
    });

    if (!data.status) throw ApiError.upstream('Paystack did not return a successful initialize response');
    return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  }

  async verifyTransaction(reference: string): Promise<VerifiedTransaction> {
    if (!env.paystack.secretKey) throw ApiError.internal('PAYSTACK_SECRET_KEY is not configured on the server');

    const data = await withRetry(async () => {
      const response = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${env.paystack.secretKey}` },
      });
      if (!response.ok) {
        const body = await response.text();
        throw ApiError.upstream(`Paystack verify failed (${response.status})`, body);
      }
      return (await response.json()) as {
        status: boolean;
        data: {
          status: string;
          reference: string;
          customer?: { customer_code?: string };
          plan?: { plan_code?: string } | string | null;
        };
      };
    });

    const tx = data.data;
    return {
      success: data.status && tx.status === 'success',
      reference: tx.reference,
      customerCode: tx.customer?.customer_code ?? null,
      subscriptionCode: null, // arrives via the subscription.create webhook, not this endpoint
      planCode: typeof tx.plan === 'object' ? tx.plan?.plan_code ?? null : null,
    };
  }

  parseWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent | null {
    if (!env.paystack.secretKey || !signatureHeader) return null;

    // Paystack signs the raw request body with your secret key (HMAC SHA512). This MUST be
    // computed against the exact bytes received. Re-serializing parsed JSON can produce a
    // different signature and silently reject legitimate events. See app.ts for how the raw
    // buffer is captured alongside the parsed body.
    const expected = crypto.createHmac('sha512', env.paystack.secretKey).update(rawBody).digest('hex');
    if (expected !== signatureHeader) return null;

    let payload: {
      id?: number;
      event: string;
      data: {
        customer?: { customer_code?: string };
        subscription_code?: string;
        plan?: { plan_code?: string } | string | null;
        plan_code?: string;
        status?: string;
        next_payment_date?: string;
        customer_code?: string;
        email?: string;
        metadata?: { userId?: string } | null;
      };
    };
    try {
      payload = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      return null;
    }

    const statusMap: Record<string, WebhookEvent['status']> = {
      active: 'active',
      complete: 'active',
      'non-renewing': 'active',
      attention: 'past_due',
      failed: 'past_due',
      cancelled: 'cancelled',
      disable: 'cancelled',
    };

    return {
      id: String(payload.id ?? `${payload.event}-${Date.now()}`),
      type: payload.event,
      customerCode: payload.data.customer?.customer_code ?? payload.data.customer_code ?? null,
      subscriptionCode: payload.data.subscription_code ?? null,
      planCode:
        typeof payload.data.plan === 'object' ? payload.data.plan?.plan_code ?? null : payload.data.plan_code ?? null,
      status: payload.data.status ? statusMap[payload.data.status] ?? null : null,
      currentPeriodEnd: payload.data.next_payment_date ?? null,
      email: payload.data.email ?? null,
      metadataUserId: payload.data.metadata?.userId ?? null,
    };
  }
}
