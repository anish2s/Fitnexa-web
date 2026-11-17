import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonClasses, EmptyState } from '@fitnexa/ui';

export default function NotFound() {
  return (
    <main className="flex min-h-[60dvh] items-center justify-center p-6">
      <EmptyState
        icon={<SearchX />}
        title="Page not found"
        description="This page doesn’t exist, or you don’t have access to it."
        action={<Link href="/" className={buttonClasses({ variant: 'secondary' })}>Go to home</Link>}
      />
    </main>
  );
}
