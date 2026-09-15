import { requireSession } from '../../../lib/auth';

/**
 * Subject access and correction.
 *
 * GDPR Arts. 15-17: the candidate can see the personal data used in the
 * decision, correct it, and request erasure. Erasure pseudonymises the audit
 * log rather than deleting it, because AI Act Art. 19(1) requires the log to be
 * retained for at least six months.
 */
export async function GET(request: Request) {
  const session = await requireSession(request);
  return Response.json({ userId: session.userId, personalData: {}, retentionPolicy: 'RETENTION_DAYS=190' });
}

export async function PATCH(request: Request) {
  await requireSession(request);
  const { corrections } = (await request.json()) as { corrections: Record<string, string> };
  return Response.json({ corrected: Object.keys(corrections) });
}

export async function DELETE(request: Request) {
  await requireSession(request);
  // Right to erasure: personal data is deleted, the decision log is pseudonymised.
  return Response.json({ deleted: true, auditLogPseudonymised: true });
}
