'use client';
import { useFormStatus } from 'react-dom';
export function SubmitButton({ children, pending = 'Working…', className }: { children: React.ReactNode; pending?: string; className?: string }) {
  const status = useFormStatus();
  return <button type="submit" className={className} disabled={status.pending} aria-busy={status.pending}>{status.pending ? pending : children}</button>;
}
