import { parseGitHubUrl } from '@annex/engine';
import { currentUser } from '@/server/auth';
import { getSystem, latestReport } from '@/server/systems';
import { PullRequestError, openRemediationPullRequest } from '@/server/github-pr';

export const dynamic = 'force-dynamic';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const system = getSystem(id, user.id);
  if (!system) return Response.json({ error: 'Not found' }, { status: 404 });

  if (system.sourceKind !== 'github') {
    return Response.json(
      {
        error: 'This system is a bundled sample, so there is no repository to open a pull request against.',
        hint: 'Download the patch instead, or add a GitHub repository.',
      },
      { status: 409 },
    );
  }
  if (!user.githubToken) {
    return Response.json(
      {
        error: 'No GitHub token configured.',
        hint: 'Add a token with contents:write and pull_requests:write in Settings.',
      },
      { status: 412 },
    );
  }

  const plan = latestReport(system.id)?.report.remediation;
  if (!plan) return Response.json({ error: 'Nothing to remediate.' }, { status: 409 });

  try {
    const { owner, repo } = parseGitHubUrl(system.source);
    const pr = await openRemediationPullRequest({ owner, repo, token: user.githubToken }, plan);
    return Response.json(pr);
  } catch (err) {
    if (err instanceof PullRequestError) {
      return Response.json({ error: err.message, hint: err.hint }, { status: 502 });
    }
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
