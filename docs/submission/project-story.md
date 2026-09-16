## Inspiration

An AI policy can say, "A person can override every decision." The harder question is whether that override exists in the system people actually use.

That gap matters when software screens a job applicant, scores a loan application, or speaks to a customer. Engineering teams know the code. Reviewers know the obligations. Too often, they work from different evidence.

We built **Annex** to connect the two. A governance claim should lead to something a person can inspect: a file, a line, a rule and a clear explanation of what remains unknown.

## What it does

Annex scans a source repository and creates an evidence workspace for AI governance review. It includes **52 executable controls across five rule packs**, with 82 source detectors.

The demo starts with four bundled systems. In HireFlow, Annex identifies emotion inference in a recruitment workflow and cites the implementation behind the finding. HireFlow v3 removes that path but still has high-risk obligations and unresolved gaps. The comparison makes an important point: fixing one problem does not make an entire system compliant.

From each scan, a reviewer can:

- Filter obligations and read the law beside the code evidence.
- See what was found, what is missing and what needs human review.
- Request an optional AI explanation for an engineer, founder or assessor.
- Export an Annex IV technical documentation draft, SARIF, an AI component inventory and an attestation.
- Download a remediation patch and inspect scan history.
- Publish a summary trust page that omits source snippets.
- Verify the signed evidence ledger and detect a report that has been altered.

Annex supports the EU AI Act, selected GDPR duties, NYC Local Law 144, Colorado ADMT and the voluntary NIST AI RMF. It is a technical evidence tool, not legal advice, a certification or a complete conformity assessment.

## How we built it

The core is a TypeScript engine with no runtime dependencies. It ingests a repository snapshot, detects patterns in code and documentation, applies explicit control rules, and builds a SHA-256 evidence chain. Ed25519 signatures support verification against a trusted public key.

The web application uses Next.js, React, Tailwind CSS and SQLite. Firebase Hosting provides the public URL, with Cloud Run serving the application. Each demo visitor gets a separate temporary workspace.

OpenAI powers the optional explanation panel. It receives an existing finding and selected excerpts. It cannot write to the scanner's results, scores or ledger. The scanner and exports also work when the model is unavailable.

Claude and OpenAI Codex were used for coding, review and documentation assistance. The project builds on open-source libraries, and the repository documents its architecture, rule corpus, tests and limitations. The demo narration is AI generated.

## Challenges we ran into

**Code that looks reassuring is not necessarily a working safeguard.** A policy document, a comment, an unused module and an import can all mention human oversight. Annex tests these cases and keeps them partial until an implementation is connected to a call site. Even then, static evidence does not prove production effectiveness.

**Dates and scope need context.** Legal rules change, transitional periods differ, and NIST is voluntary. We checked the EU implementation timeline against European Commission sources, clarified public claims and kept uncertainty visible in the corpus documentation.

**A public demo needs its own boundaries.** We replaced the shared editable demo account with isolated visitor workspaces, fixed Firebase session handling, bounded archive downloads, added AI usage limits and tested access across workspaces.

## Accomplishments that we're proud of

The demo connects a source finding to a reviewable next step. It produces useful artifacts without asking a judge to configure credentials or trust an unexplained model verdict.

The engine passes **461 tests**, including golden fixtures, classification checks and adversarial cases. Its 50-case in-house benchmark is a regression test, not a claim of real-world accuracy. We also check the application through its APIs and browser, including exports, access isolation, settings, mobile layouts and the hosted deployment.

## What we learned

A useful governance tool must be precise about both its evidence and its limits. "No evidence found" is different from "this control does not exist." A signature proves something about a key and a report, not about whether a system is lawful.

We also learned that the last mile matters. A correct engine is not enough if a visitor loses their session, a download fails behind a hosting proxy, or the mobile interface hides the evidence.

## What's next for Annex

Next steps are independent evaluation on unfamiliar repositories, legal expert review of the rule packs, better call-path analysis and support for systems spread across multiple repositories. Durable team workspaces and encrypted private-repository integrations would turn the public prototype into a tool teams can use over time.

The goal stays simple: help the people building AI and the people reviewing it work from evidence they can both check.

## Try it in three minutes

Open https://annex-evidence.web.app and select **Try the demo**, then **Enter the demo workspace**. No signup or key is needed. Open **HireFlow**, inspect **Evidence**, then compare **HireFlow v3**. Try **Annex IV dossier**, **Remediation**, **History** and **Share**.

Use public or sample code. Workspaces expire after 24 hours or a service restart, so download reports you want to keep. Private repository tokens and direct pull-request creation are available only in a self-hosted installation.
