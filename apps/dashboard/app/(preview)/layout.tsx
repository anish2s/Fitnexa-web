import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '../globals.css';

// Design preview (Milestone 0): sample data only, independent of the API and of the host's gym.
// Off in production unless ENABLE_DESIGN_PREVIEW=true, so gym domains never show Fitnexa's preview.
export const metadata: Metadata = { title: 'Design preview', robots: { index: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function PreviewRootLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DESIGN_PREVIEW !== 'true') notFound();
  return (
    <html lang="en-IN" data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-bg text-fg text-base" suppressHydrationWarning>{children}</body>
    </html>
  );
}
