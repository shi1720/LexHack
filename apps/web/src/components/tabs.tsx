'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Tabs({ base, items }: { base: string; items: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="scroll-x border-b" style={{ borderColor: 'var(--line)' }} aria-label="System sections">
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
