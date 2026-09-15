import { cookies } from 'next/headers';

export interface Session {
  userId: string;
  orgId: string;
  role: 'recruiter' | 'admin';
}

/** Session cookie is issued by the org SSO exchange. */
export async function requireSession(_request: Request): Promise<Session> {
  const jar = await cookies();
  const token = jar.get('hf_session')?.value;
  if (!token) throw new Error('unauthorized');
  return decodeSession(token);
}

function decodeSession(token: string): Session {
  const [userId, orgId, role] = Buffer.from(token, 'base64').toString().split(':');
  return { userId: userId!, orgId: orgId!, role: role as Session['role'] };
}
