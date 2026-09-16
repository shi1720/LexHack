import { PrivateResponse as Response } from '@/server/http';
import { packsForMarkets, toAttestation, toMlBom, toSarif } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';

export const dynamic = 'force-dynamic';

const FORMATS = {
  sarif: { ext: 'sarif', type: 'application/json' },
  cdxa: { ext: 'cdx.json', type: 'application/vnd.cyclonedx+json' },
  mlbom: { ext: 'mlbom.cdx.json', type: 'application/vnd.cyclonedx+json' },
  json: { ext: 'json', type: 'application/json' },
} as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await params;
  const system = getSystem(id, user.id);
  if (!system) return new Response('Not found', { status: 404 });

  const latest = latestReport(system.id);
  if (!latest) return new Response('No completed scan for this system.', { status: 409 });

  const requested = new URL(request.url).searchParams.get('format') ?? 'json';
  const spec = FORMATS[requested as keyof typeof FORMATS];
  if (!spec) return new Response(`Unknown format "${requested}".`, { status: 400 });

  const body =
    requested === 'sarif'
      ? toSarif(latest.report)
      : requested === 'cdxa'
        ? toAttestation(latest.report, packsForMarkets(system.markets))
        : requested === 'mlbom'
          ? toMlBom(latest.report)
          : JSON.stringify(latest.report, null, 2);

  const safeName = system.name.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  return new Response(body, {
    headers: {
      'Content-Type': spec.type,
      'Content-Disposition': `attachment; filename="${safeName}.${spec.ext}"`,
    },
  });
}
