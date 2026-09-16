import { PrivateResponse as Response } from '@/server/http';
import { renderPatch } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const system = getSystem(id, user.id);
  if (!system) return new Response('Not found', { status: 404 });

  const latest = latestReport(system.id);
  const plan = latest?.report.remediation;
  if (!plan) return new Response('Nothing to remediate.', { status: 409 });

  const safeName = system.name.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  return new Response(renderPatch(plan), {
    headers: {
      'Content-Type': 'text/x-patch; charset=utf-8',
      'Content-Disposition': `attachment; filename="${safeName}-conformity.patch"`,
    },
  });
}
