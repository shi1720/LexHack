# Devpost submission — Annex

> Copy each section into the matching Devpost field. Word counts are noted where
> the field has a practical limit.

---

## Project name

**Annex**

## Tagline (one line)

Proof, not paperwork — Annex reads your codebase, decides where it falls under the EU AI Act, and proves every obligation with a file, a line and a hash.

## Elevator pitch (Devpost's short description, ~200 characters)

Every AI Act conformity dossier is a document a company wrote about itself. Annex reads the code instead: 52 obligations, cited to the line, hash-chained so anyone can re-verify.

---

## Inspiration

*Built by Shivam Gupta, with Claude as a pair programmer. "We" below means that pair.*

The EU AI Act asks a handful of questions that have factual answers: does your system log inference, can a human override it, did you examine your training data for bias, do you tell people they are talking to a machine. Every one of those answers is sitting in a repository right now.

And every conformity dossier in existence answers them with a document the company wrote about itself. That is not a criticism of anyone's diligence — it is the only thing the process allows. The person filling in the dossier cannot read the repository, and the people who can read the repository are never asked.

So we went looking for the tool that reads them, and found the IAPP's 2026 census of roughly ninety AI-governance vendors. We searched it for `source code`, `static analysis`, `SAST`, `codebase`, `git repo`. **Two hits** — one a GDPR privacy scanner, the other the phrase "a U.S. codebase." (Six unfunded open-source projects do attempt code-grounded scanning; the mechanic is proven and unclaimed, which is a better reason to build than an empty field would be. `docs/BUSINESS.md` names them.)

Then, researching the deadline, we found something that changed the project. On 27 July 2026 the Digital Omnibus — Regulation (EU) 2026/1744 — pushed the Annex III high-risk deadline from August 2026 out to 2 December 2027, and the industry exhaled. **It left Article 50 exactly where it was.** If your product talks to a person or generates content, you have been in scope since 2 August 2026, with €15 million or 3 % of worldwide turnover attached. Machine-readable marking of generated content is due 2 December 2026.

The deadline that everybody is relaxed about is the one that already passed.

## What it does

Annex points at a Git repository and produces four things, in about a quarter of a second.

**1. A classification you can argue with.** Not "high risk, 78 %" but *Annex III, point 4(a) — recruitment and candidate selection, 97 % confidence*, cited to `src/screening/rank.ts:28`, the line that actually rejects the candidate:

```ts
const decision = candidateScore >= ADVANCE_THRESHOLD ? 'advance' : 'reject';
```

**2. An evidence explorer.** Every obligation, the verbatim text of the law that imposes it, and the lines of your code that answer it — filtered by what binds *today* versus what binds in December 2027, because those are different problems. Where nothing was found, the negative finding is recorded too: `No match for: human review, override, kill switch, feature flag`.

**3. The Annex IV technical documentation.** The Article 11 dossier, in English, German or French, generated from the evidence. Every point is either backed by a citation, recorded as a negative finding, or **left explicitly open** — because a generated document that invents the residual-risk acceptance is a false statement about the system to whoever relies on it — and where it is supplied to an authority in reply to a request, Article 99(5) prices incorrect or misleading information at €7.5 million.

**4. A pull request that closes what code can close.** Additive files only, never overwriting anything a human wrote: an Article 12 inference log with a 190-day retention default (the six-month floor is Article 19(1) for providers and Article 26(6) for deployers; Article 12 sets no period), an Article 14 oversight gate where adverse outcomes never auto-apply, an Article 50(1) disclosure module in three languages, and the Article 9/10/13/72/73 documents scaffolded from what the scan already found — with `TODO` at exactly the points where the answer is a human judgement.

Plus the things that make it real infrastructure: SARIF so findings land in GitHub's Security tab on the line that caused them, a CycloneDX attestation (ECMA-424) and an ML-BOM, a CI check that fails the build below a conformity floor, and a **public trust page** — the artefact a customer's security reviewer actually asks for, with a ledger root they can check.

## The reframe

Everyone treats AI Act compliance as a **paperwork** problem. It is a **verification** problem. The documents already exist; what does not exist is any way to check whether they are true.

So the two things Annex does that nobody else does:

**The law gets a test suite.** A control is a function, so it can be tested. Every high-severity obligation ships golden fixtures — a minimal repository and the status the control must return for it. `npm test` runs all of them. If a regex gets greedier or a keyword gets dropped, the obligation fails there rather than silently mis-reporting somebody's conformity.

**The evidence ledger.** Every control result is reduced to a canonical line — the control, its status, the rule-pack version, the SHA-256 digest of every file it cites — and hashed into a chain. The root goes on the front page of the dossier. Re-run the scan on the same commit and you get the same root. `annex verify` re-derives every entry from the results the report describes — edit one status and it names the entry that stopped matching — and `--against <dir>` re-hashes each cited file off disk. The chain alone is tamper-evident rather than tamper-proof, and only for a reader who has the source — so `annex scan --sign` signs the root with Ed25519 and `annex verify --pubkey` checks it against a key the reader already trusts. That is what catches the one attack a checksum chain cannot: rebuilding a consistent chain over altered results and re-signing it with your own key. Without `--pubkey`, verify says so in those words instead of printing a green banner. There is still no timestamp authority, so a signature says who and not when.

And one thing only a code-grounded tool *can* do. Article 3(23) defines a **substantial modification** as a change, *after the system is placed on the market or put into service*, that affects compliance with Chapter III Section 2 — and Article 43(4) then requires a new conformity assessment. `annex diff --base origin/main --head HEAD` detects the change that would be one: delete the human-review gate and Annex says so, in the pull request. On a system already on the market that is the Article 43(4) trigger; on one that is not yet, it is the same measurement arriving early enough to be cheap. A questionnaire structurally cannot do either.

## How we built it

**A deterministic engine with zero runtime dependencies.** `packages/engine` is pure TypeScript: a first-party tar reader (a compliance tool that pulls in forty packages to read a `.tar.gz` is making an argument against itself), 82 signal detectors, a readable classification rule table, 52 controls, the hash chain, the dossier builder and the exporters. The analysis never touches the network and never calls a model; fetching a GitHub tarball is the one network call, and it happens before any analysis begins. The same commit always produces the same ledger root — not a performance optimisation, but the reason the output is usable as evidence.

**Three pieces of engineering we are glad we did:**

*Evidence ranking.* Collecting citations is easy; putting the right one first is not. Within a file Annex keeps the **best** matching lines rather than the first — a definition beats a usage, and imports come first in a file. Across files it prefers definitions, then files the signal is dense in, then the most specific pattern. That is why the citation lands on the line that rejects the candidate and not on `"openai"` in `package.json`.

*Keyword prefilters.* Each detector carries a lowercase substring check against the whole file before any line is scanned, so most files never reach the line loop. A 191-file repository — this one — scans in ~450 ms.

*The Article 99(6) inversion.* Fines are normally the *higher* of a flat cap and a percentage of turnover — except for SMEs and start-ups, where Article 99(6) caps them at the **lower** of the two. Almost every summary of the Act gets this backwards. Annex implements the actual arithmetic, which is why the EU AI Act line for a 38-person company with €4.2m turnover reads €294,000 rather than a meaningless €35 million. (The headline on that scan is €20,000,000 — the GDPR Article 83(5) ceiling for the same failures, because Article 83 has no inversion. Getting *that* right meant modelling each regime on its own terms instead of picking whichever tier sat second in an array.) It also implements the definition the Article borrows: Recommendation 2003/361/EC needs headcount *and* a financial test, so unknown financials resolve to *not* an SME. The inversion lowers the cap, and guessing in the generous direction hands an operator a ceiling an order of magnitude too low.

**Stack:** Node 22, TypeScript strict, Next.js 16 / React 19 server components, Tailwind 4, SQLite via `better-sqlite3`, `jose` for sessions, Vitest, Playwright. 135 tests, a 50-case benchmark, CI that typechecks, tests, benchmarks and then runs Annex on Annex.

**Where the language model is.** Exactly one place, labelled `model-written` in the UI: rewriting an *already settled* finding for an engineer, a founder or an assessor. The prompt hands it the decision as fact and forbids re-deciding it. With no API key that one panel explains itself and everything else is unaffected. One model call in the whole product, labelled, unable to change a status.

## Challenges we ran into

**The deadline moved six weeks before we started, and we nearly shipped the wrong dates.** We scoped this against the well-known 2 August 2026 high-risk deadline. Reconciling against primary sources turned up Regulation (EU) 2026/1744, in force 27 July 2026, which moved Annex III to 2 December 2027 and Annex I to 2 August 2028 — while leaving Article 50 untouched. A tool that hard-codes one deadline would have been wrong by sixteen months. Every control now carries **its own application date**, and the report splits into "conformity" and "in force today". A later review found we had still got one of those dates wrong — Article 25 sits in Chapter III Section 3 and was marked generally applicable — so the corpus now has a test that checks every control against a written-down Article 113 table. The product's own thesis, applied to itself.

**Our benchmark found three real bugs, and one of them was embarrassing.** Domain signals were firing on *prose*: a documentation site explaining that emotion inference in hiring is prohibited was being classified as prohibited. Domain detectors are now scoped to source files only, and that documentation site is a permanent benchmark case.

**Then Annex scanned Annex and reported Annex as containing a prohibited practice.** A rule pack is source code that quotes the thing it detects — our Article 5(1)(f) control carries a golden fixture of emotion-inference code so the detector can be tested. This will be true of every regulation compiler ever built. We shipped `.annexignore` with gitignore syntax and negation; excluded files are still ingested, still hashed and **still counted in the report's warnings**, so the report stays honest about what it did not read.

**And then the self-scan found a real gap in us.** With the noise gone, `gdpr.art17.erasure` came back `missing` — Annex stored user accounts with no deletion path. We fixed it rather than excluding it. Account export and permanent erasure are in Settings, and that control is green.

**The self-scan returns 70/100, and we are leaving it there.** The other control that binds a tool calling no model is NIST AI RMF MEASURE 2.11 — fairness and bias evaluated and documented — and it comes back `partial`. The only lines in this repository that mention a bias audit are the docblock in `evaluate/denial.ts` that quotes, as an illustration, the exact sentence its patterns exist to catch: *"We have never commissioned a bias audit."* Annex's own invariant says a comment can corroborate a verdict and cannot carry one, so it capped the control and cited the comment. One line in `.annexignore` would make that 100/100. Adding it is precisely the move this whole project exists to argue against, so the CI gate is pinned at `--fail-under 70` instead. A tool that cannot survive its own check should say so rather than adjust the check.

**Getting a "missing" verdict to be auditable.** Early versions returned `missing` with no evidence, which is an assertion, not a finding. Every negative verdict now records what was searched for, so a reader can disagree with the search rather than having to trust the verdict.

## Accomplishments we're proud of

Taking a repository from `git clone` to a cited classification, a nine-section Annex IV dossier, a CycloneDX attestation and a ten-file remediation pull request **in about a tenth of a second, offline, with no model call** — and being able to prove the answer is the same one anybody else would get from the same commit.

And publishing our error rate. Risk-tier accuracy **100 %**, finding recall **100 %**, carve-out precision **100 %** on a 50-case hand-labelled corpus of which roughly half exists to catch false positives: card-fraud detection (expressly excluded from Annex III 5(b)), one-to-one identity verification (expressly excluded from 1(a)), campaign logistics tooling (excluded by Annex III 8(b) because nobody is exposed to its output), invoice OCR (Article 50(2) does not reach a system that re-expresses its input), a consumer mood-journal app that is Annex III 1(c) high-risk and *not* the Article 5(1)(f) prohibition, and that documentation site.

A clean sheet is a statement about the corpus, not about the world — these labels were written by the same people who wrote the detectors, and the report says so. Building the corpus is still what found the bugs: domain signals firing on prose, a missing Article 50(2) rule, broken `go.mod` parsing, and an Article 50(2) carve-out that was stated in the caveat text and never implemented, and a domain detector that fired on a `//` comment rather than on code — which Annex found by scanning itself and reporting itself as an emotion-recognition system. Five cases exist specifically to find the edge of what static analysis can decide, including a lending decision expressed only in SQL and a chat widget whose AI-ness may or may not be "obvious to a reasonably well-informed" person, which is a judgement about a reader rather than a fact about a file.

## What we learned

That the interesting problem in legal tech is not generation, it is **verification**. A frontier model can draft a plausible Annex IV document this afternoon; what it cannot do is tell you whether the document is true. Building for verification forced every design decision to be different — deterministic over fluent, cited over confident, reproducible over impressive.

That the boundaries in the statute are where the value is. Emotion inference is *prohibited* in hiring under Article 5(1)(f) and merely *high-risk* in a wellness app under Annex III 1(c). Credit scoring is high-risk unless it is fraud detection. Face matching is high-risk unless it is one-to-one verification. Every one of those carve-outs is a benchmark case, because getting them wrong is the difference between "fix this" and "this is illegal."

And that most teams have the provider/deployer question backwards. Article 3(3) makes whoever develops an AI system and ships it under their own name the **provider**. Calling someone else's API does not make you only a deployer — and Article 25(1)(c) is explicit that pointing a general-purpose model at an Annex III use case makes *you* the provider of a high-risk system while the model vendor is not. Annex says this on the overview page of every scan, because it decides who owns the entire Article 16 stack.

## What's next for Annex

**A GitHub App**, so the conformity check is a required status on the default branch and the substantial-modification comment posts itself on the pull request. The CLI and SARIF output already work in CI; the App turns a scan anyone can ignore into a gate nobody can.

After that: customer-authored detectors for in-house ML platforms, and getting a generated dossier in front of a notified body — TÜViT, Nemko and Bureau Veritas are the names — because the question that decides whether this is a product or a demo is whether an assessor will accept code-grounded evidence as a starting artefact. That is a question about institutions, not code, and it is answered by knocking on doors.

## Built with

`typescript` · `node.js` · `next.js` · `react` · `tailwindcss` · `sqlite` · `better-sqlite3` · `jose` · `vitest` · `playwright` · `sarif` · `cyclonedx` · `anthropic-claude` · `eu-ai-act` · `static-analysis` · `compliance-as-code`

## Try it out

- **Repository:** https://github.com/shi1720/LexHack
- **Live demo:** one click into a seeded workspace — no signup, no credit card, no API key. Hosting takes about five minutes on any platform with a persistent container and a writable volume; [`docs/DEPLOY.md`](DEPLOY.md) has the recipe, and says why a serverless platform is the one thing that will not work.
- **In the terminal:** `npm install && npm run build && node packages/cli/dist/bin.js scan fixtures/hireflow --markets eu,us-nyc`
- **Benchmark:** `npm run benchmark` — it prints its own failures
- **Self-scan:** `npm run selfscan` — Annex checking Annex

---

## Image captions

Upload in this order; Devpost uses the first as the gallery thumbnail.

1. `05-evidence.png` — **The screen the product exists to render.** Article 5(1)(f) on the left, the `detectEmotion()` call that breaches it on the right, with the verbatim statutory text between them.
2. `04-overview-prohibited.png` — **A classification you can argue with.** Each finding carries its own confidence and its own citation: the Article 5(1)(f) prohibition at 89 %, the Annex III point 4(a) classification at 97 %, cited to the line that rejects the candidate. The EU AI Act exposure line reads €294,000, not €35 million, because Article 99(6) inverts the cap for SMEs — while the GDPR line beside it is the full €20,000,000, because Article 83 does not.
3. `06-dossier.png` — **The Annex IV dossier, generated.** Nine sections, every statement cited to a file and a line, and the open items derived from the control results rather than hardcoded — so the count means something and the document cannot contradict itself.
4. `07-remediation.png` — **The files that close what code can close.** Additive only, `_TODO_` at every human judgement — and the projected score already assumes that merging them is not enough, because the next scan reads a scaffold as a scaffold.
5. `09-history-drift.png` — **Substantial modification, detected from the diff.** Two scans of the same system, six weeks apart: conformity 80 → 3, high → prohibited, 31 controls changed. Article 43(4) re-opens the conformity assessment, and only a tool that reads code can tell you it happened.
6. `10-trust-page.png` — **What a customer's security reviewer gets.** The classification, the obligations and a ledger root they can check — and no source code.
7. `02-landing-clock.png` — **The deadline moved; the obligations did not.** What is in force today, versus what everybody is waiting for.
