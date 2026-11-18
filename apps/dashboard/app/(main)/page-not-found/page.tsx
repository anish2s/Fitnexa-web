import { notFound } from 'next/navigation';

/**
 * Target of proxy.ts when a page is refused by role: renders "Page not found" with a real 404 status
 * (outside the signed-in shell, so nothing has been streamed yet). Same answer as an unknown page.
 */
export default function PageNotFound() {
  notFound();
}
