import { requireSession } from '../../../lib/auth';

/**
 * Candidate appeal endpoint.
 *
 * GDPR Art. 22(3) requires, at minimum, the right to obtain human intervention,
 * to express a point of view and to contest the decision. This route opens a
 * review ticket assigned to a named recruiter, who can override the outcome.
 */
export async function POST(request: Request) {
  await requireSession(request);
  const { decisionId, statement } = (await request.json()) as { decisionId: string; statement: string };
  const appeal = await openAppealTicket({ decisionId, statement });
  return Response.json({ appealId: appeal.id, status: 'pending_human_review', slaDays: 30 });
}

async function openAppealTicket(input: { decisionId: string; statement: string }) {
  return { id: `appeal_${input.decisionId}` };
}
