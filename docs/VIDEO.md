# Demo video — script and shot list

**Target: 2 minutes 50 seconds.** Under 3:00 is a hard requirement; some judges stop the clock.

Everything below in **bold** is said out loud, word for word. Everything in plain text is what happens on screen. Word counts are calibrated to roughly 160 words per minute, which is an unhurried speaking pace — if you naturally speak faster, slow down rather than adding words.

---

## Before you record

- [ ] `npm run build && npm start` — the app running at `localhost:3000`
- [ ] **Already signed in.** Do not film the login. Open `/app` in a fresh window and start there.
- [ ] Browser at **1440 × 900**, zoom 100 %, bookmarks bar hidden, no extensions visible
- [ ] Light theme (it reads better on compressed video than dark)
- [ ] A second tab open at the `HireFlow` **Evidence** page, pre-loaded
- [ ] A third tab open at the `HireFlow v3` **Evidence** page, pre-loaded — the `Evidenced` beat needs it
- [ ] A terminal window, font size ~16pt, dark background, sitting in the repo root
- [ ] Pre-type this in the terminal so you only press Enter:
      `node packages/cli/dist/bin.js diff --base fixtures/hireflow-remediated --head fixtures/hireflow --markets eu,us-nyc`
- [ ] Phone on silent, notifications off, Do Not Disturb on
- [ ] A real microphone if you have one. Bad audio is a top-six reason judges disengage
- [ ] Record at 1080p or better, then upload to YouTube as **Unlisted**, marked **"Not made for kids"**, with captions cleaned up

**Record in five takes, one per section, and cut them together.** It is far easier than getting 2:50 right in one pass, and the cuts are invisible.

---

## 0:00 – 0:10 · Cold open

> No title card. No logo. No "hi, we're team X." The first frame is the product doing the thing.

**Screen:** The HireFlow **Overview** page, already loaded, the red `PROHIBITED PRACTICE` badge visible. Hold perfectly still for two seconds before speaking.

**Say:**

> **This is a hiring product. It went live eighteen months ago. And this line of code makes it illegal to sell in the European Union.**

**Screen:** On "this line of code", cut to the evidence citation — `src/interview/signal.ts:17`, `export async function detectEmotion(...)`. Let it sit for a beat.

*(30 words)*

---

## 0:10 – 0:38 · The problem

**Screen:** Scroll slowly to the classification card so `EU AI Act Art. 5(1)(f)` and the verbatim quote are on screen.

**Say:**

> **Article 5 of the EU AI Act bans inferring emotion from people in the workplace. That has been in force since February 2025. Nobody on this team knew, because compliance lives in a PDF and the system lives in a repository, and nothing connects them.**
>
> **So every AI Act conformity dossier in existence is a document a company wrote about itself. Nobody has ever checked one against the system it describes.**

**Screen:** On the last sentence, cut to the landing page's "In force today / Coming" clock.

**Say:**

> **And most teams think they have until December 2027. That's the high-risk deadline — it moved last July. Article 50 didn't. If your product talks to a person or generates content, you've been in scope since August, at fifteen million euros or three percent of turnover.**

*(105 words)*

---

## 0:38 – 1:55 · The flow

**Screen:** Cut to the **Evidence** tab of HireFlow.

**Say:**

> **Annex reads the code instead. Statute on the left, your source on the right.**

**Screen:** Click `Art. 14 — Human oversight` in the list. Let the detail panel render.

**Say:**

> **Article 14 says a person must be able to override the system. Annex searched the whole repository and found no review step, no override, and no stop control — and it records what it searched for, so you can disagree with the search instead of having to trust the verdict.**

**Screen:** Switch to the **HireFlow v3** tab (pre-loaded on its Evidence page), click the `Evidenced` filter, then click any satisfied control so a green `Evidenced` badge and a real code citation are visible. Two seconds.

> On HireFlow itself `Evidenced` is **0** — it satisfies nothing — so this beat has to be on v3 or it puts "Nothing matches that filter" on camera.

**Say:**

> **Where the code does satisfy an obligation, it cites the line that proves it.**

**Screen:** Cut to the **Annex IV dossier** tab. Scroll down through two or three sections so the amber "Open" boxes are clearly visible.

**Say:**

> **This is the Annex Four technical documentation, generated. Nine sections, every statement cited to a file and a line — and fifteen items left deliberately blank, because the residual-risk acceptance is a human judgement, and a generated document that invents it is a false statement to a regulator.**

**Screen:** Cut to the **Remediation** tab. Expand one file — `lib/ai-act/audit-log.ts` — and scroll a few lines so the statutory comment is readable.

**Say:**

> **Then it writes the fix. Additive files only, with the article number in the comment and a TODO wherever a person has to decide. And merging it doesn't make you compliant — the next scan reads these files the way an auditor would, so a document with unfilled placeholders counts as partial, and a module nothing calls counts as partial.**

**Screen:** Cut to the **History** tab of HireFlow. The red `Substantial modification` badge, `78 → 4`, `high → prohibited`, and the regressed list underneath. Hold three seconds.

**Say:**

> **And because it reads code, it can do the one thing a questionnaire can't.**

**Screen:** Scroll one notch so `Effective human oversight  satisfied → missing` is centred.

**Say:**

> **Between these two scans of the same system, someone put the affect-inference feature back and deleted the human review gate. Article 43(4) says that re-opens the whole conformity assessment. Annex caught it from the diff.**

> Optional, if the pacing allows: cut to the terminal and press Enter on the pre-typed `annex diff` for two seconds, to show the same finding is available in CI. Drop it first if you are over time — the History page is the stronger shot, because it is the product rather than a log.

*(180 words)*

---

## 1:55 – 2:20 · How it works

**Screen:** The architecture diagram (`docs/diagram-architecture.png`), full frame, static.

**Say:**

> **Forty-five obligations across five jurisdictions, each compiled into a function with its own citation and its own start date. The engine is deterministic and offline — it never calls a model, because an auditor can't accept "the model thought so" as evidence.**

**Screen:** Cut to the terminal, run `annex verify report.json`. The green `LEDGER INTACT` banner.

**Say:**

> **Every result is hashed into a chain. Re-run it on the same commit and you get the same root. Edit one status in the report and verify names the entry that stopped matching. That's the difference between a document and a proof.**

**Screen:** Cut to the terminal, run `npm run benchmark`.

**Say:**

> **And it publishes its error rate. Forty-two hand-labelled cases, half of them carve-outs designed to catch a keyword matcher, including five written to find the edge of what static analysis can decide. It passes all forty-two — and the report says plainly that this is a statement about the corpus, not about the world.**

*(115 words)*

---

## 2:20 – 2:40 · Impact and limits

**Screen:** The **Trust page** for HireFlow v3, scrolled so the ledger root and the obligations table are visible.

**Say:**

> **This is what a customer actually asks you for. When an enterprise buyer asks an AI vendor for their AI Act evidence, today they get a PDF. This is the same evidence, published, with a root the reviewer can check.**
>
> **What Annex is not: it's not a conformity assessment, and finding a logging call doesn't prove the logs are retained. It reports what's observable and marks the rest open.**

*(75 words)*

---

## 2:40 – 2:50 · Close

**Screen:** The landing page hero. `Proof, not paperwork.` Full frame.

**Say:**

> **Annex. It reads your codebase, and it proves every obligation with a file, a line, and a hash. Proof, not paperwork.**

**Screen:** Hold on the hero with the repository URL as an on-screen caption for the last three seconds:
`github.com/shi1720/LexHack`

*(25 words)*

---

**Total spoken: ~530 words ≈ 2 minutes 50 seconds at an unhurried pace.**

---

## On-screen text overlays

Add these as simple captions. No animation, no transitions beyond hard cuts.

| Time | Overlay |
|---|---|
| 0:12 | `Article 5(1)(f) — in force since 2 February 2025` |
| 0:30 | `Annex III high-risk: moved to 2 Dec 2027. Article 50: unchanged.` |
| 0:40 | `Evidence explorer` |
| 1:10 | `Annex IV technical documentation — Article 11` |
| 1:35 | `Substantial modification — Article 3(23), Article 43(4)` |
| 1:58 | `45 obligations · 5 jurisdictions · 0 model calls` |
| 2:12 | `42 cases · 100% tier accuracy · 100% carve-out precision` |
| 2:44 | `github.com/shi1720/LexHack` |

## Things not to do

Taken from what judges say costs points:

- **No slide deck.** Not one slide beyond the architecture diagram.
- **No live typing.** Pre-type every terminal command; press Enter only.
- **No loading spinners.** Every page is pre-loaded before its take starts.
- **No feature tour.** One flow, start to finish. Features you do not show still exist in the repo.
- **No "as you can see".** Say what it does, not what is visible.
- **Do not claim anything the demo does not show.** The honest-limits line at 2:20 is worth more than another feature.

## If you have 30 seconds spare

Cut the "Where the code does satisfy an obligation" beat at 1:05 — it is the least load-bearing sentence. Do **not** cut the honest-limits line or the benchmark; those are the two moments that make the rest credible.
