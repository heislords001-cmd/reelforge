/**
 * Same philosophy as the AI provider layer (see providers/README.md): routes and services
 * depend on this interface, never on a concrete payment vendor SDK. Swapping Paystack for
 * Flutterwave or Stripe later means writing one class that satisfies this interface.
 * nothing in routes/services/frontend needs to change.
 */

export interface CheckoutSession {
  /** URL to redirect the user's browser to for hosted checkout. */
  authorizationUrl: string;
  /** Vendor's reference for this specific transaction attempt. */
  reference: string;
}

export interface VerifiedTransaction {
  success: boolean;
  reference: string;
  customerCode: string | null;
  subscriptionCode: string | null;
  planCode: string | null;
}

export interface WebhookEvent {
  /** Vendor-specific event id, used for idempotency (payment_events table). */
  id: string;
  type: string;
  customerCode: string | null;
  subscriptionCode: string | null;
  planCode: string | null;
  status: 'active' | 'past_due' | 'cancelled' | null;
  currentPeriodEnd: string | null;
  /** Email on the event. Used to find the user when metadata doesn't carry a user id. */
  email: string | null;
  /** Only present on the FIRST charge (the one initiated through initializeCheckout's
   *  metadata). Renewal/cancellation events won't have this, and get matched by
   *  customerCode/subscriptionCode against the subscriptions row created on that first charge. */
  metadataUserId: string | null;
}

export interface PaymentProvider {
  readonly name: string;

  /** Starts a hosted checkout for the given user, tied to the configured recurring plan. */
  initializeCheckout(input: { email: string; userId: string; callbackUrl: string }): Promise<CheckoutSession>;

  /** Confirms a transaction client-side redirect brought back. Best-effort UX, not canonical. */
  verifyTransaction(reference: string): Promise<VerifiedTransaction>;

  /** Verifies a webhook's signature and parses it into a normalized event, or returns null if invalid. */
  parseWebhook(rawBody: Buffer, signatureHeader: string | undefined): WebhookEvent | null;
}
