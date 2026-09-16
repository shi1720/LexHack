# Deploying the demo

Annex is a Node server with a SQLite file and no external services. That makes
it easy to host and rules out one whole class of platform: **it cannot run on a
serverless platform without changes**, because `better-sqlite3` is a native
module and the demo writes to disk. Vercel's serverless runtime will build it
and then fail at runtime, which is a worse outcome than not trying.

So: anything that gives you a persistent container and a writable volume.
Fly.io and Railway both do, on a free or near-free tier, and both take about
five minutes.

## What it needs

| | |
|---|---|
| Runtime | Node 22 |
| Build | `npm ci && npm run build` |
| Start | `npm start` (serves on `$PORT`, default 3000) |
| Disk | One writable directory for `apps/web/data/annex.db` — a few MB |
| Network | None at runtime. Outbound HTTPS only if you enable GitHub scanning or the optional explain panel |
| Secrets | None required. Session and ledger-signing keys are generated on first boot |

Two optional environment variables:

- `ANNEX_FIXTURES` — absolute path to the repository root, so the bundled
  sample codebases resolve. Set it to your app directory.
- `ANTHROPIC_API_KEY` — enables the one model-written panel. Without it that
  panel explains itself and nothing else changes.

## Fly.io

```bash
fly launch --no-deploy            # accept the Dockerfile it generates
fly volumes create annex_data --size 1
```

Then in `fly.toml`:

```toml
[env]
  ANNEX_FIXTURES = "/app"

[[mounts]]
  source = "annex_data"
  destination = "/app/apps/web/data"
```

```bash
fly deploy
```

## Railway

New project → Deploy from GitHub repo. Set the build command to
`npm ci && npm run build`, the start command to `npm start`, add a volume
mounted at `/app/apps/web/data`, and set `ANNEX_FIXTURES=/app`.

## A container, anywhere

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci && npm run build
ENV ANNEX_FIXTURES=/app
EXPOSE 3000
CMD ["npm", "start"]
```

`docker run -p 3000:3000 -v annex-data:/app/apps/web/data annex`

## Before you share the link

The demo workspace is deliberately open — one click, no signup — because that
is what makes it reviewable. That is a demo posture, not a production one.
[`SECURITY.md`](../SECURITY.md) lists what is not hardened; the two that matter
if the link is public are that GitHub tokens are stored in plaintext in the
SQLite file, and that the scan endpoint has no rate limiting and is CPU-bound.

Do not point the hosted demo at a private repository you care about, and do not
paste a real GitHub token into it.
