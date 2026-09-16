# Submission checklist

Everything the code can do is done and verified. What is left is four things
that need a person: a browser, a terminal, a microphone, and a Devpost login.
This is the order to do them in and roughly what each costs.

---

## 1. Make the repository public · 2 minutes · **blocking**

`github.com/shi1720/LexHack` is **private**. A judge who clicks the link gets a
404, and a private repository also means GitHub refuses the SARIF upload in CI
(the step is allowed to fail for exactly that reason, and starts working the
moment the repository is public).

> Settings → General → Danger Zone → Change repository visibility → Public

Before making it public, check nothing local leaked in:

```bash
git ls-files | grep -Ei '\.env|\.key$|secret|credential|annex-signing' || echo "clean"
```

That prints two `.env.example` files inside the bundled fixtures. Both are
empty templates — `OPENAI_API_KEY=` and `DATABASE_URL=` with nothing after the
`=` — and they are there because a realistic fixture has one. Nothing else
matches. `.gitignore` covers `*.db`, `.env*` and the data directory, and no
signing key is committed: `annex keygen` writes one on demand at mode `0600`.

Nothing else needs changing. The default branch is already
`claude/lexhack-2026-project-yycmys`, so the link works as-is; renaming it to
`main` is cosmetic and entirely optional.

---

## 2. Deploy the demo · 15 minutes · **the single highest-value thing left**

[`DEPLOY.md`](DEPLOY.md) has the working recipes. Fly.io is the shorter one.
The one constraint it leads with, because it is the one that will waste an
hour: Annex uses a native SQLite module and writes to disk, so **Vercel and
other serverless platforms will build it happily and then fail at run time**.
Use a platform with a real filesystem.

```bash
fly launch --no-deploy          # accept the generated fly.toml
fly volumes create annex_data --size 1
fly secrets set ANNEX_SECRET="$(openssl rand -hex 32)"
fly deploy
```

Then, before the link goes anywhere public, read the last section of
`DEPLOY.md`: the demo workspace is deliberately open so a reviewer can walk
straight in, which is a demo posture and not a production one.

Sanity-check the deployment with the same script CI uses:

```bash
node scripts/smoke.mjs https://<your-app>.fly.dev
```

Thirty checks, about ninety seconds. If they pass, the deployment works end to
end — signup, scan, evidence, dossier, exports, trust page, sessions.

---

## 3. Record the video · 45 minutes · **worth the most per minute**

[`VIDEO.md`](VIDEO.md) is a word-for-word script: shot list, on-screen actions,
timings, and word counts calibrated to about 160 words per minute. It runs
2:50. There is nothing left to decide — read it, do the takes, cut.

Two notes from the script that are easy to miss:

- Do the **pre-flight checklist** at the top first. It has you generate a
  signing key and sign a report *before* recording, so the `annex verify
  --pubkey` shot is instant rather than a wait on camera.
- The tab-switching beat for HireFlow v3 is no longer necessary. The Evidence
  tab's empty state now explains itself and links across, so you can stay in
  one tab if you prefer.

Devpost weights video heavily. A judge who cannot watch anything reads the
README and scores from the docs.

---

## 4. Fill in the Devpost form · 20 minutes

[`DEVPOST.md`](DEVPOST.md) is written to be pasted field by field: project
name, tagline, elevator pitch, inspiration, what it does, how we built it,
challenges, accomplishments, what we learned, what's next, built with, try it
out. The image captions at the bottom map to the files in
[`../docs/screenshots/`](screenshots/).

Fields that need something from steps 1–3:

| Devpost field | What to put |
|---|---|
| Try it out — website | The Fly.io URL from step 2 |
| Try it out — repository | `https://github.com/shi1720/LexHack`, once public |
| Video demo link | The YouTube/Vimeo link from step 3 |

Upload the screenshots in the order the captions list them. `05-evidence.png`
is the strongest single image — statute on the left, the code that answers it
on the right — and it is the one to lead with.

---

## What a judge can verify, and the command that shows it

Worth knowing before the Q&A, because these are the claims someone will test:

| Claim | Command | What they will see |
|---|---|---|
| It reads code and cites lines | `annex scan fixtures/hireflow --markets eu,us-nyc` | A prohibited practice, cited to `src/interview/signal.ts:17` |
| The report is tamper-evident | edit one status in `report.json`, then `annex verify report.json` | `LEDGER BROKEN`, the entry named, exit 1 |
| Nothing goes green because a file exists | `npm run attack` | Four refusals with reasons, then one real call site going green |
| It works on real code | `cat docs/WILD.md` | Five open-source products, and the four things it got wrong |
| It survives its own check | `npm run selfscan` | 70/100, and the write-up says why it is not 100 |
| The numbers in the docs are true | `npm run check:counts` | 38 documented claims derived from the corpus |
| The product actually runs | `npm run smoke` | 30 end-to-end checks from an empty database |

---

## Known limits, stated plainly

These are in [`../README.md`](../README.md) under *Limitations and known
issues* and in [`WILD.md`](WILD.md). Do not let a judge discover any of them
before you say them — each is much cheaper volunteered than found:

- **English-only detection.** A German or Spanish hiring model with a threshold
  and an automatic advance/reject is unambiguously Annex III point 4(a), and
  Annex sees nothing in it. For a tool aimed at the EU, that is the largest
  class of false negative it has.
- **One open false positive**, in `WILD.md`, with the reason the obvious fix
  does not work.
- **`satisfied` means the evidence is there**, not that the duty is discharged.
  Reachability analysis is the fix and it is not built.
- **No design partner and no notified body has seen a generated dossier.**
  Whether an assessor accepts code-grounded evidence as a starting artefact is
  the question that decides whether this is a product, and it is a question
  about institutions rather than about code.
