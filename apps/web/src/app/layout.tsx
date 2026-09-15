import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Annex — conformity evidence, compiled from source code',
    template: '%s · Annex',
  },
  description:
    'Annex reads your codebase, decides where it falls under the EU AI Act, and proves every obligation with a file, a line and a hash. Proof, not paperwork.',
  applicationName: 'Annex',
  authors: [{ name: 'Shivam Gupta' }],
  keywords: ['EU AI Act', 'AI governance', 'compliance as code', 'Annex IV', 'conformity assessment', 'static analysis'],
  openGraph: {
    title: 'Annex — conformity evidence, compiled from source code',
    description:
      'Every AI Act conformity dossier in existence is a self-attested document nobody has checked. Annex reads the code instead.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
