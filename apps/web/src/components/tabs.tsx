'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useRef } from 'react';

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
