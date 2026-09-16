import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';

/*
  The design language argues with type: a serif for anything the law says, a
  monospace for anything the code says, a neutral sans for the interface that
  holds them together. That argument only reaches a reader whose machine
  happens to have the fonts · Iowan Old Style is macOS-only, Palatino Linotype
  is Windows-only · so on a Linux judging laptop both stacks collapsed to
  DejaVu and the distinction silently disappeared.

  next/font self-hosts the files at build time, so the page still makes no
  request to a font CDN at runtime.
*/
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
});

export const metadata: Metadata = {
  title: {
    default: 'Annex · conformity evidence, compiled from source code',
    template: '%s · Annex',
  },
  description:
    'Trace AI governance findings to source code. Review cited evidence, export a technical dossier, and verify the evidence ledger.',
  applicationName: 'Annex',
  authors: [{ name: 'Shivam Gupta' }],
  keywords: ['EU AI Act', 'AI governance', 'compliance as code', 'Annex IV', 'conformity assessment', 'static analysis'],
  openGraph: {
    title: 'Annex · conformity evidence, compiled from source code',
    description:
      'AI governance evidence you can trace to the code. Built for engineering teams and the people reviewing their systems.',
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
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
