'use client';

import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

/**
 * Theme is a per-viewer convenience, so it lives in localStorage and the page
 * renders correctly without it. The default is "system", which stamps nothing
 * and leaves prefers-color-scheme in charge.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('annex-theme') as Theme | null;
      if (stored) {
        setTheme(stored);
        apply(stored);
      }
    } catch {
      /* private window or blocked site data — the default look is correct anyway */
    }
  }, []);

  function apply(next: Theme) {
    const root = document.documentElement;
    if (next === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', next);
  }

  function cycle() {
    const order: Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length]!;
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem('annex-theme', next);
    } catch {
      /* ignore */
    }
  }

  const label =
    theme === 'system' ? 'Theme: follow system' : theme === 'light' ? 'Theme: light' : 'Theme: dark';

  return (
    <button type="button" className="btn btn-sm" onClick={cycle} aria-label={label} title={label}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {theme === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </>
        ) : theme === 'dark' ? (
          <path
            d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" fill="currentColor" />
          </>
        )}
      </svg>
      <span className="sr-only">{label}</span>
    </button>
  );
}
