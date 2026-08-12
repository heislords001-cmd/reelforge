import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { authService } from '../services/authService';
import { subscriptionService } from '../services/subscriptionService';
import { paymentProvider } from '../providers/payment';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const billingRouter = Router();

// GET /api/billing/status. Trial days left, current plan, active subscription (if any).
billingRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = await subscriptionService.getBillingStatus(req.user!.userId);
    res.json(status);
  })
);

// POST /api/billing/checkout. Starts a hosted Paystack checkout for the recurring plan.
billingRouter.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getById(req.user!.userId);
    const session = await paymentProvider.initializeCheckout({
      email: user.email,
      userId: user.id,
      callbackUrl: `${env.clientOrigin}/billing/callback`,
    });
    res.json(session);
  })
);

// POST /api/billing/verify. Called by the frontend right after the checkout redirect.
// Best-effort immediate UX only; the webhook below is the authoritative source of truth.
billingRouter.post(
  '/verify',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = z.object({ reference: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) throw ApiError.badRequest('Missing transaction reference');

    const result = await subscriptionService.confirmCheckout(req.user!.userId, parsed.data.reference);
    res.json(result);
  })
);

// POST /api/billing/webhook. Paystack server-to-server event delivery. NOT authenticated
// with requireAuth (Paystack isn't a logged-in user). Authenticity comes entirely from the
// HMAC signature, verified against the raw request body captured in app.ts.
billingRouter.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = req.rawBody;

    if (!rawBody) {
      logger.error('Webhook received without raw body captured. Check app.ts express.json verify hook');
      return res.status(500).end();
    }

    const event = paymentProvider.parseWebhook(rawBody, signature);
    if (!event) {
      // Invalid signature or unparseable payload. Reject without leaking why.
      return res.status(400).end();
    }

    // Await BEFORE responding. On Vercel, sending the response can freeze the function
    // instance shortly after, which would kill a "fire and forget" background write before
    // it finishes. This processing is a few fast DB queries, well within Paystack's webhook
    // timeout tolerance, so there's no real cost to waiting for it.
    try {
      await subscriptionService.handleWebhookEvent(event);
    } catch (err) {
      logger.error('Failed to process Paystack webhook event', {
        type: event.type,
        error: err instanceof Error ? err.message : 'unknown',
      });
      // Still return 200 below. We don't want Paystack hammering retries for an error on
      // our side that a retry won't fix; the failure is logged for manual follow-up instead.
    }

    res.status(200).end();
  })
);
