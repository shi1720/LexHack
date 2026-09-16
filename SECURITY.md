# Security

Annex reads source code. That makes its threat model unusual for a compliance
tool, and worth writing down.

## What the engine does with your code

`packages/engine` has no network access and calls no model. It reads a tree,
holds it in memory, emits a report, and exits. Nothing is uploaded, cached or
sent anywhere by the analysis — the one network call in the whole engine is
`ingest/github.ts` fetching a repository tarball, and it happens before the
analysis begins. Scanning a local path makes none at all.

Reports contain **quoted source lines**. A scan report, an Annex IV dossier and
a SARIF file all cite code, so treat them as you would treat the code. The
public trust page is the deliberate exception: it publishes classifications,
citations and the ledger root, and never a source line.

## Reporting a vulnerability

Open a [security advisory](https://github.com/shi1720/LexHack/security/advisories/new)
rather than a public issue. Include the version, the command, and the smallest
repository that reproduces it.

Please do report:

- a path that escapes the scan root, or writes outside the output path you gave
- a crafted repository that makes the CLI or the web app execute anything
- a way to read another workspace's systems, scans or GitHub token
- a way to forge a session
- a way to make `annex verify` report `LEDGER INTACT` over a report whose
  results or cited files have changed

## Running the web app

- **`ANNEX_SECRET`.** Sessions are signed with it. Unset, the app generates a
  random secret on first boot and keeps it in the SQLite file, which is right
  for one instance and wrong for several — set it explicitly to a random 32+
  character string for any deployment behind more than one process.
- **GitHub tokens are stored in the database in plaintext.** They need
  `contents:write` and `pull_requests:write` to open a remediation PR. Until
  they are encrypted at rest, treat the database file as a secret: a fine-
  grained token scoped to the repositories you actually scan limits the blast
  radius, and the app works without a token for local fixtures.
- **The database file is the whole system.** `apps/web/data/annex.db` holds
  users, systems, scan reports and tokens. Back it up as a secret or not at all.
- **Self-host.** The architecture is designed for it: no egress, deterministic,
  no model. If you are evaluating Annex against a repository you cannot share,
  run it yourself rather than pointing a hosted instance at it.

## What is not hardened yet

Stated plainly, because a trust product that overstates its own security is
making the same mistake it exists to catch:

- GitHub tokens are not encrypted at rest (above).
- There is no rate limiting on the web app's scan endpoint. A scan is CPU-bound
  and synchronous, so a large repository blocks the Node process for seconds.
- **A signature says who, not when.** `annex scan --sign` signs the ledger root
  with Ed25519 and `annex verify --pubkey` checks it, which closes the gap a
  bare checksum chain leaves: an editor can rebuild a self-consistent chain over
  altered results, re-sign it with a key of their own and paste that public key
  into the report. Only a key the reader already trusts catches that, which is
  why `annex verify` without `--pubkey` says in terms that it has established
  the report is unedited since *somebody* signed it and nothing more. There is
  no timestamp authority, so a signature does not establish when a scan was run,
  and nothing here distributes or revokes keys — that is still yours to solve.
- Signing is opt-in in the CLI. An unsigned report is still internally
  verifiable and is what `annex scan` produces by default, because a scan has to
  work with no key and no configuration.
- **The web app signs everything, with a key it generates on first boot and
  stores in the same SQLite file as the sessions and the tokens.** That keeps
  "clone and run" working, and it means anyone with the database file can sign
  as that installation. For a deployment whose trust page anyone relies on, the
  signing key belongs somewhere the application server can read and an attacker
  with the database cannot.
