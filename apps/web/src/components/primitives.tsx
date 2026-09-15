import type { ReactNode } from 'react';

/** The Annex wordmark: an annex is the document nobody wants to write. */
export function Logo({ size = 22, muted = false }: { size?: number; muted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ fontSize: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <rect x="3" y="2" width="14" height="20" rx="2" stroke="currentColor" strokeWidth="1.6" opacity={muted ? 0.5 : 1} />
        <path d="M7 7h6M7 11h6M7 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity={muted ? 0.5 : 1} />
        <path d="M15 17l3 3 4-6" stroke="var(--moss)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontWeight: 650, letterSpacing: '-0.02em' }}>Annex</span>
    </span>
  );
}

export const TIER_LABEL: Record<string, string> = {
  prohibited: 'Prohibited practice',
  high: 'High risk',
  transparency: 'Transparency obligations',
  minimal: 'Minimal risk',
  gpai: 'General-purpose AI model',
  unknown: 'No AI system detected',
};

const TIER_CLASS: Record<string, string> = {
  prohibited: 'badge-bad',
  high: 'badge-warn',
  transparency: 'badge-info',
  minimal: 'badge-ok',
  gpai: 'badge-info',
  unknown: 'badge-neutral',
};

export function TierBadge({ tier }: { tier: string }) {
  return <span className={`badge ${TIER_CLASS[tier] ?? 'badge-neutral'}`}>{TIER_LABEL[tier] ?? tier}</span>;
}

const STATUS_CLASS: Record<string, string> = {
  satisfied: 'badge-ok',
  partial: 'badge-warn',
  needs_review: 'badge-warn',
  missing: 'badge-bad',
  not_applicable: 'badge-neutral',
};

const STATUS_LABEL: Record<string, string> = {
  satisfied: 'Evidenced',
  partial: 'Partial',
  needs_review: 'Needs review',
  missing: 'No evidence',
  not_applicable: 'Not applicable',
};

export function StatusBadge({ status, prohibition }: { status: string; prohibition?: boolean }) {
  const label = prohibition && status === 'missing' ? 'Breach' : (STATUS_LABEL[status] ?? status);
  return <span className={`badge ${STATUS_CLASS[status] ?? 'badge-neutral'}`}>{label}</span>;
}

/**
 * The score dial.
 *
 * Deliberately not a gauge that always looks reassuring: below 50 it is
 * crimson, and a breached prohibition caps the number at 25 so the colour and
 * the number agree with each other.
 */
export function ScoreDial({
  score,
  label,
  size = 132,
  sublabel,
}: {
  score: number;
  label: string;
  size?: number;
  sublabel?: string;
}) {
  const stroke = size > 110 ? 9 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // A score of zero used to draw no arc at all, which reads as "failed to
  // load" rather than "measured, and it is nothing". A short stub in the
  // failing colour says the difference.
  const dash = Math.max((score / 100) * circumference, circumference * 0.012);
  const colour = score >= 80 ? 'var(--moss)' : score >= 50 ? 'var(--amber)' : 'var(--crimson)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* The number and its label sit in the sibling text below, so the
            graphic is decoration as far as a screen reader is concerned. */}
        <svg width={size} height={size} aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: size * 0.3, fontWeight: 650, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {score}
            <span className="sr-only"> out of 100 — {label}</span>
          </span>
          <span className="eyebrow" aria-hidden="true" style={{ fontSize: 9.5 }}>
            / 100
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="eyebrow">{label}</div>
        {sublabel ? (
          <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{sublabel}</div>
        ) : null}
      </div>
    </div>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone?: 'bad' | 'warn' | 'ok'; hint?: string }) {
  const colour = tone === 'bad' ? 'var(--crimson)' : tone === 'warn' ? 'var(--amber)' : tone === 'ok' ? 'var(--moss)' : 'var(--ink)';
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div style={{ fontSize: 20, fontWeight: 620, letterSpacing: '-0.02em', color: colour, lineHeight: 1.3 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}

export function Citation({ short, locator, title, url }: { short: string; locator: string; title?: string; url?: string }) {
  const body = (
    <>
      <span style={{ fontWeight: 600 }}>
        {short} {locator}
      </span>
      {title ? <span style={{ color: 'var(--ink-faint)' }}> — {title}</span> : null}
    </>
  );
  return url ? (
    <a className="cite hover:underline" href={url} target="_blank" rel="noreferrer noopener">
      {body}
    </a>
  ) : (
    <span className="cite">{body}</span>
  );
}

export function EvidenceLine({ path, line, snippet, kind }: { path: string; line: number; snippet: string; kind: string }) {
  if (kind === 'absence') {
    return (
      <div className="evidence" style={{ borderLeftColor: 'var(--line-strong)' }}>
        <span className="evidence-loc" style={{ color: 'var(--ink-faint)' }}>
          repository-wide search
        </span>
        <code className="evidence-snippet" style={{ color: 'var(--ink-faint)' }}>
          {snippet}
        </code>
      </div>
    );
  }
  return (
    <div className="evidence">
      <span className="evidence-loc">
        {path}:{line}
      </span>
      {/* Focusable, because a region that scrolls and cannot be focused cannot
          be scrolled without a mouse (WCAG 2.1.1). */}
      <code
        className="evidence-snippet"
        tabIndex={0}
        role="region"
        aria-label={`Source line: ${path} line ${line}`}
      >
        {snippet}
      </code>
    </div>
  );
}

export function Panel({ title, action, children, tight }: { title?: ReactNode; action?: ReactNode; children: ReactNode; tight?: boolean }) {
  return (
    <section className="card">
      {title ? (
        <header
          className="flex items-center justify-between gap-3 border-b px-5 py-3"
          style={{ borderColor: 'var(--line)' }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 620, margin: 0, letterSpacing: '-0.01em' }}>{title}</h2>
          {action}
        </header>
      ) : null}
      <div className={tight ? '' : 'p-5'}>{children}</div>
    </section>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h3>
      <p style={{ maxWidth: 430, color: 'var(--ink-faint)', fontSize: 13.5, margin: 0 }}>{body}</p>
      {action}
    </div>
  );
}

export function money(n: number, currency: 'EUR' | 'USD' = 'EUR'): string {
  const symbol = currency === 'USD' ? '$' : '€';
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  return `${symbol}${n.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

export function relativeDays(days: number): string {
  if (days <= 0) return 'in force';
  if (days < 45) return `${days} days`;
  if (days < 400) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
