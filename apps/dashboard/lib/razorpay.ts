'use client';

import type { RazorpayCheckout } from '@fitexaa/api-client';

/** Razorpay Checkout's own script (the only way to open its payment window). */
const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<void> | null = null;
function load(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error('Couldn’t load Razorpay. Check the internet connection and try again.'));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export type CheckoutOutcome = { kind: 'paid'; orderId: string; paymentId: string; signature: string } | { kind: 'dismissed' } | { kind: 'failed'; message: string };

/** Opens Razorpay Checkout for an order the API created; resolves when the window closes. */
export async function runCheckout(params: RazorpayCheckout, color: string): Promise<CheckoutOutcome> {
  await load();
  return new Promise((resolve) => {
    let failed: string | null = null;
    const rzp = new window.Razorpay!({
      key: params.keyId,
      order_id: params.orderId,
      amount: params.amountPaise,
      currency: params.currency,
      name: params.name,
      description: params.description,
      prefill: params.prefill,
      theme: { color },
      handler: (r: RazorpaySuccess) => resolve({ kind: 'paid', orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => resolve(failed ? { kind: 'failed', message: failed } : { kind: 'dismissed' }) },
    });
    rzp.on('payment.failed', (r) => {
      failed = r.error?.description ?? 'The payment didn’t go through.';
    });
    rzp.open();
  });
}
