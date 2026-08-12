import { PaystackProvider } from './paystackProvider';
import { PaymentProvider } from './types';

// Unlike the AI providers (where a user might pick between several at once), billing only
// ever has one active vendor at a time. So this is a single swappable export rather than a
// name-keyed registry. To switch to Flutterwave or Stripe later: write a class satisfying
// PaymentProvider, swap the export below. BillingService and routes never change.
export const paymentProvider: PaymentProvider = new PaystackProvider();
