'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const strip = useRef<HTMLElement>(null);

  /**
   * Drop the trailing fade once there is nothing left to scroll to, so the
   * hint is never lying about there being more.
   */
  const onScroll = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    el.style.setProperty('--fade-end', atEnd ? '0px' : '22px');
  }, []);

  /**
   * Scroll the current tab into view.
   *
   * At 390px the strip is wider than the screen, so landing on Remediation
   * put its own tab half off the right edge, reading as `Re` with a fade over
   * it — the page you are on, clipped, on the tab bar that tells you where you
   * are. `nearest` so the common case, where the active tab is already
   * visible, does not move anything.
   */
  useEffect(() => {
    const el = strip.current?.querySelector('[aria-current="page"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    onScroll();
  }, [pathname, onScroll]);

  return (
    <nav
      ref={strip}
      className="scroll-x scroll-fade border-b"
      style={{ borderColor: 'var(--line)' }}
      aria-label="System sections"
      onScroll={onScroll}
    >
      <ul className="flex gap-1" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === '' ? pathname === base : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'inline-block',
                  padding: '9px 13px',
                  fontSize: 13.5,
                  fontWeight: active ? 620 : 480,
                  color: active ? 'var(--ink)' : 'var(--ink-faint)',
                  textDecoration: 'none',
                  borderBottom: `2px solid ${active ? 'var(--ink)' : 'transparent'}`,
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
