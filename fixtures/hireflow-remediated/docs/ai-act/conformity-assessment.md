# Conformity assessment

Regulation (EU) 2024/1689, Article 43. Part of the Annex IV technical
documentation.

## Which procedure applies

HireFlow is high-risk under **Annex III, point 4(a)** — recruitment and
candidate selection. It is not an Annex III point 1 biometric system.

Under **Article 43(2)**, an Annex III point 2 to 8 system follows the
**internal control** procedure in **Annex VI**. No notified body is involved.
We checked this before budgeting for one.

## What we did

| Annex VI step | Evidence | Completed |
|---|---|---|
| Quality management system in place under Article 17 | `docs/ai-act/quality-management.md` | 2026-06-30 |
| Technical documentation drawn up under Article 11 and Annex IV | `docs/ai-act/annex-iv-technical-documentation.md` | 2026-07-02 |
| Design and development, and post-market monitoring, verified as consistent with that documentation | `docs/ai-act/post-market-monitoring.md` | 2026-07-09 |
| Section 2 requirements (Articles 8 to 15) verified | the control table in the Annex IV dossier | 2026-07-09 |

Assessment completed **2026-07-09** by the accountable person named in the
quality management system.

## When this has to happen again

**Article 43(4):** a substantial modification within Article 3(23) — a change
after placing on the market, not foreseen in this assessment, that affects
compliance with Chapter III Section 2 — reopens it. The CI check in
`.github/workflows/ai-act-conformity.yml` runs `annex diff` on every pull
request against `origin/main` for exactly this reason.
