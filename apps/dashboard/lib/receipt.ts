'use client';

import type { ApiClient } from '@fitexaa/api-client';

/**
 * Opens a payment's PDF receipt in a new tab. The PDF needs the bearer token, so it is fetched here
 * and shown from a blob URL. The tab is opened before the request so pop-up blockers allow it; if it
 * is blocked anyway, the file downloads instead.
 */
export async function openReceipt(api: ApiClient, paymentId: string, receiptNumber: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const blob = await api.download('/api/v1/payments/{id}/receipt', { params: { id: paymentId } });
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptNumber.replace(/\//g, '-')}.pdf`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw err;
  }
}
