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

  // The button keeps its name. Mutating the label of the control you just
  // pressed loses its identity for a screen-reader user mid-interaction, and a
  // live region on the trigger itself announces unreliably; the confirmation
  // belongs in a separate status region.
  return (
    <>
      <button type="button" className={className ?? 'btn btn-sm'} onClick={copy}>
        <span aria-hidden="true" style={{ opacity: copied ? 1 : 0, width: copied ? 'auto' : 0, overflow: 'hidden' }}>
          ✓
        </span>
        {label}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Copied to clipboard' : ''}
      </span>
    </>
  );
}
