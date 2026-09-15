'use client';

import { useState } from 'react';

export function CopyButton({ label, text, className }: { label: string; text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; fall back to a selection the user can copy.
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      area.setSelectionRange(0, text.length);
      setCopied(true);
      setTimeout(() => {
        area.remove();
        setCopied(false);
      }, 1800);
    }
  }

  return (
    <button type="button" className={className ?? 'btn btn-sm'} onClick={copy} aria-live="polite">
      {copied ? '✓ Copied' : label}
    </button>
  );
}
