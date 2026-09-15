import { currentUser, exportUserData } from '@/server/auth';

export const dynamic = 'force-dynamic';

/** GDPR Art. 15 / Art. 20: everything Annex holds about you, in one file. */
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  return new Response(JSON.stringify(exportUserData(user.id), null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="annex-account-export.json"',
    },
  });
}
