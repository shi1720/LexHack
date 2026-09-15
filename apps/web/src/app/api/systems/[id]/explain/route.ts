import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { explainControl, type Audience } from '@/server/narrative';

export const dynamic = 'force-dynamic';

const AUDIENCES: Audience[] = ['engineer', 'executive', 'auditor'];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const system = getSystem(id, user.id);
  if (!system) return Response.json({ error: 'Not found' }, { status: 404 });

  const latest = latestReport(system.id);
  if (!latest) return Response.json({ error: 'No completed scan.' }, { status: 409 });

  const body = (await request.json().catch(() => ({}))) as { controlId?: string; audience?: string };
  const control = latest.report.controls.find((c) => c.controlId === body.controlId);
  if (!control) return Response.json({ error: 'Unknown control.' }, { status: 400 });

  const audience = (AUDIENCES.includes(body.audience as Audience) ? body.audience : 'engineer') as Audience;
  return Response.json(await explainControl(control, latest.report, audience));
}
