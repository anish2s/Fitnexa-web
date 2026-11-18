'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@fitnexa/ui';

const COOKIE = 'fx_theme';

/** The theme on <html> (set by the server, the "system" script, or a toggle). */
const readTheme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
function subscribeTheme(onChange: () => void) {
  const o = new MutationObserver(onChange);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => o.disconnect();
}

/** Switches dark/light instantly and remembers it in a cookie so the server renders it next time. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => 'dark' as const);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; // observed below: re-renders every toggle
    document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      onClick={toggle}
      className={cn('rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-fg', className)}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
