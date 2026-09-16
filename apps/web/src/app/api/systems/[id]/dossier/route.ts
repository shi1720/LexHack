import { PrivateResponse as Response } from '@/server/http';
import { buildDossier, dossierToHtml, dossierToMarkdown } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const system = getSystem(id, user.id);
  if (!system) return new Response('Not found', { status: 404 });

  const latest = latestReport(system.id);
  if (!latest) return new Response('No completed scan for this system.', { status: 409 });

  const url = new URL(request.url);
  const locale = (['en', 'de', 'fr'].includes(url.searchParams.get('locale') ?? '') ? url.searchParams.get('locale') : 'en') as 'en' | 'de' | 'fr';
  const simplified = url.searchParams.get('simplified') === '1';
  const format = url.searchParams.get('format') === 'html' ? 'html' : 'md';

  const dossier = buildDossier(latest.report, { locale, simplified, provider: user.orgName || user.name });
  const safeName = system.name.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();

  if (format === 'html') {
    return new Response(dossierToHtml(dossier, latest.report), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  return new Response(dossierToMarkdown(dossier, latest.report), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-annex-iv-${locale}.md"`,
    },
  });
}
