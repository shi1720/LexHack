# Annex deployment

Live demo: https://annex-evidence.web.app

Firebase Hosting forwards requests to the `annex` Cloud Run service in `us-central1`. The Dockerfile builds the engine, CLI and Next.js app on Node 22. The server listens on Cloud Run's `PORT`.

## Update the deployed demo

With authenticated Google Cloud and Firebase CLIs:

```bash
./scripts/deploy-firebase.sh
```

The deployment script runs unit tests, a build, typechecking, documentation counts, adversarial checks and a hosted integration suite. It uses an existing build identity and an isolated Annex runtime identity. The runtime can access only the `annex-openai` secret explicitly granted to it. API keys never enter the source tree or browser bundle.

## Public demo boundaries

The public demo deliberately uses **temporary SQLite storage on one Cloud Run instance**. It is not durable account hosting. Each visitor receives a random identity and separate workspace. Workspaces expire after 24 hours (cleaned on requests) or a container restart. Download exports to keep them. Trust links have the same lifetime.

`ANNEX_PUBLIC_DEMO=1` disables account registration, password sign-in, GitHub token storage and direct pull-request creation. Public repository scans, sample scans, settings, downloads, verification and public summaries remain available. Hosted limits: 12 systems per workspace, 8 scans per system per minute, 100 new demo workspaces per hour and 100 uncached model explanations per instance per hour. Archive downloads and decompressed sizes are bounded.

Sessions use the `__session` cookie that Firebase Hosting forwards to Cloud Run. Every API response, including errors, sets `Cache-Control: private, no-store, max-age=0` to prevent cached access decisions. AI calls are server-side and receive only the selected finding and up to five excerpts after the visitor chooses an audience.

## Self-hosting for durable or private work

Set `ANNEX_PUBLIC_DEMO=0`, mount persistent storage at `ANNEX_DB`, set `ANNEX_FIXTURES` to the repository root and provide a random `ANNEX_SECRET` of at least 32 characters. Run one process with the SQLite file on a local persistent filesystem. Do not place a WAL database on a Cloud Storage FUSE volume. Scale only after moving to a database designed for multiple application instances.

Optional `OPENAI_API_KEY` with `OPENAI_MODEL` (default `gpt-4.1-mini`) enables explanations. `ANTHROPIC_API_KEY` remains a supported alternative. Without either, the panel explicitly returns the original rule-based finding. `ANNEX_ORIGIN` should be the public HTTPS origin.

Self-hosted GitHub tokens and the installation signing key are stored in the SQLite database. Protect that disk and its backups. Use a fine-grained token scoped to one repository. Reading needs contents:read; opening a requested remediation pull request also needs contents:write and pull_requests:write. Annex does not claim production readiness for sensitive private repositories.
