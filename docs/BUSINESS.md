# The commercial case

Written the way it would be written for an investor who is going to check the numbers, which means the weaknesses are in here too. Sources are linked; where a widely-quoted figure is unreliable, it says so.

---

## 1. Who buys this

Not "companies subject to the AI Act." The realistic buyer is narrower, and naming it honestly is the difference between a market and a slide.

**Core ICP: AI product companies that sell into the EU.**

They are simultaneously (a) *providers* of an AI system under Article 3(3), (b) EU-exposed, and (c) in possession of a repository somebody can actually scan. Most Annex III **deployers** — HR departments, lenders, schools, hospitals — *buy* AI rather than build it. They have no repository, so they are not the first customer even though they carry obligations.

The buyer inside that company is not one person, which is the usual reason compliance tools stall:

| Who | What they feel | What Annex gives them |
|---|---|---|
| **Engineering lead** | "Legal keeps asking me questions about our own code" | A CI check and a PR. Zero procurement. |
| **Founder / CTO** | "An enterprise deal is blocked on an AI governance questionnaire" | A trust page to send back today |
| **Legal / compliance** | "I am signing a document I cannot verify" | Evidence with a citation and a hash |

The IAPP's 2026 profession report finds ~50 % of AI-governance professionals sit in legal, compliance, privacy or ethics. That is where the budget is and it is **not** where developer tools get adopted. The bridge is the trust page: engineering adopts the scanner, sales pulls it into deals, legal pays for the dossier.

## 2. Why now, and why the obvious "why now" is wrong

Every vendor in this category built a 2026 plan around the 2 August 2026 high-risk deadline. On 27 July 2026 the Digital Omnibus — [Regulation (EU) 2026/1744](https://artificialintelligenceact.eu/ai-act-explorer/digital-omnibus/) — moved Annex III to **2 December 2027** and Annex I to **2 August 2028**. Those pitches are dead.

What it did **not** move:

| Obligation | Status | Exposure |
|---|---|---|
| Article 5 prohibited practices | In force since 2 Feb 2025 | €35 M or 7 % of turnover |
| GPAI obligations | In force since 2 Aug 2025 | €15 M or 3 % (Art. 101) |
| **Article 50 transparency** | **In force since 2 Aug 2026** | **€15 M or 3 %** |
| Art. 50(2) machine-readable marking, grandfathered systems | **Due 2 Dec 2026** | €15 M or 3 % |
| NYC Local Law 144 bias audits | Enforced since 5 Jul 2023 | Per-day penalties |

So the correct framing is not "get ready for 2027." It is: **the obligations that bind you today are the ones nobody is talking about, and the fifteen-month deferral is exactly enough time to build the evidence pipeline before the deadline that everyone *is* talking about arrives.**

The honest counterpoint: budgets follow deadlines, so expect an air pocket in AI Act spending through 2026 and H1 2027. Anyone raising on urgency right now is raising into the trough. That is a reason to lead with Article 50 and the trust page, which are today-problems, rather than with the Annex IV dossier, which is a 2027 problem.

## 3. What everybody else does

The IAPP's [AI Governance Vendor Report 2026](https://assets.contentstack.io/v3/assets/bltd4dd5b2d705252bc/blt386189207a33dc5d/ai_governance_vendor_report_2026.pdf) is the category census: roughly ninety vendors, each describing itself. Searched for `source code`, `code repositor*`, `static analysis`, `SAST`, `code scan`, `codebase`, `git repo`, it returns **two hits** — one a GDPR privacy scanner, the other the phrase "a U.S. codebase."

| Vendor | Funding | Evidence method |
|---|---|---|
| Credo AI | ~$41 M | Registry, questionnaires, metadata integrations |
| Holistic AI | ~$35 M | Discovery + model-level bias tests |
| Vanta (ISO 42001 module) | $504 M | API integrations, policy docs, config evidence |
| Drata (AI Agent Governance) | ~$100 M ARR | Same |
| Saidot | €1.75 M | Regulatory knowledge graph → questionnaires |
| Trustible, Modulos, Naaia | $4–9 M each | Assessments |
| **Relyance AI** | **$62 M** | **Code-to-cloud data lineage — the one to watch** |

**The honest version of the differentiation claim**, because the naive one is falsifiable in a single search: *code-grounded AI Act scanning exists as unfunded open source — at least six projects, none with traction.* [Systima Comply](https://systima.ai/blog/systima-comply-eu-ai-act-compliance-scanning) (Apache-2.0) does import, dependency, config and call-chain analysis against Articles 5, 9–15 and 50. What none of them has is a dossier an assessor will accept, a verification story, auditor relationships or distribution.

So the claim is not "nobody thought of this." It is: **the mechanic is proven and unclaimed.** Relyance ($62 M) and HoundDog.ai prove enterprises will let a tool read their code for compliance. Semgrep ($204 M), Socket ($60 M at $1 B) and Endor Labs ($188 M) prove the developer-first scanner GTM works. Nobody has put the two together for AI regulation and shipped something a notified body would accept.

## 4. What is actually defensible

Not the regulation-to-control mapping. The Commission ships a free [compliance checker](https://ai-act-service-desk.ec.europa.eu/en), ETH/INSAIT's COMPL-AI is open, and once prEN 18286 publishes, the checklist is public and uniform. Mapping is a commodity within a year.

Four things are not:

1. **False-positive economics.** Endor Labs raised $93 M essentially on reachability — on having *fewer, truer* findings. Here the equivalent problem is harder: telling a genuine Article 14 human-oversight control from an `if approved:` branch, across LangChain, vLLM, HuggingFace, sklearn, PyTorch and every in-house framework. That precision is a multi-year data asset, and it is why the benchmark in this repository is half carve-outs.
2. **Acceptance history.** Knowing *which observable code patterns an assessor actually accepts* as evidence of Article 14 oversight can only be learned from dossiers that were accepted and rejected. Nobody can copy that.
3. **Workflow position.** A required status check on the default branch is among the stickiest positions in software. Remediation PRs go further: Annex has written code that now lives in the customer's repository, with its citations in the comments.
4. **Substantial-modification detection.** Article 43(4) re-opens the conformity assessment whenever a change affects Chapter III compliance. That is triggered by a code change — and only the tool that watches code changes can see it. It is also the natural recurring-revenue event.

## 5. Pricing

The regulation's unit of account is the **AI system**, not the developer or the repo, so that is the unit to price on: it is legible to the buyer and it maps to a budget line that already exists.

| Tier | Price | What it buys |
|---|---|---|
| **Open source** | Free | CLI, GitHub Action, detectors, SARIF, risk-tier classification |
| **Team** | $35 / contributor / month | Blocking PR check, remediation PRs, drift detection |
| **Conformity** | $12–25 k / governed AI system / year | Annex IV dossier, CDXA attestation bundle, evidence-freshness monitoring, substantial-modification alerts |
| **Enterprise** | $75–250 k | Multi-system, self-hosted, assessor export, custom detectors |

Anchors, from the market as it prices today: a boutique readiness sprint is **~€9,900**; larger consultancies charge **$15–50 k**; Big-4 readiness programmes rarely start under **€75,000** at €200–400/hour; third-party conformity assessment runs **€10–40 k per system**. The Commission's own impact assessment (CEPS/ICF/Wavestone) put a new quality management system at **€193,000–€330,000 upfront plus ~€71,400/year**.

> Two figures you will see quoted that should not be: the "€400,000 per SME product" number double-counts setup and annual maintenance, and the "€31 bn cumulative" figure applies a high-risk overhead to *all* AI investment when roughly 10 % of systems are high-risk. [CEPS rebutted both](https://www.ceps.eu/clarifying-the-costs-for-the-eus-ai-act/). The "$8–15 M per enterprise" figure circulating in 2026 traces to an op-ed with no methodology.

A defensible starting ACV is **$25–40 k** — one or two governed systems plus seats. Below Big-4, above Vanta's ISO 42001 module (+$7.5–10 k/year on a ~$19 k base), and credible against a legal budget.

## 6. Unit economics

Every number below is a projection with its assumption written next to it. Nothing here is measured revenue — there is none. What *is* measured is the cost side, because the engine already exists and its cost per scan is a fact rather than a forecast.

**Cost of goods sold is close to nothing, and that is a design consequence, not luck.** The engine is deterministic and offline: classification and control evaluation never call a model. A ~206-file repository — this one — evaluates 52 obligations in about 690 ms of a single core. A customer scanning 40 systems on every push, at 200 pushes a system a month, spends about **an hour of CPU a month**. The only variable cost that scales with usage is storage of reports and ledgers, which are tens of kilobytes each.

| Line | Per customer / month | Assumption |
|---|---|---|
| Compute (scans, dossier and export rendering) | $6–18 | 8k scans/month, burst-scheduled on shared vCPU |
| Storage and egress (reports, ledgers, artefacts) | $2–5 | ~40 systems × 200 reports × ~80 kB, retained 24 months |
| The one model call, when enabled | $1–4 | ~2k output tokens per rewrite, rate-limited per seat |
| Support and success, amortised | $90–160 | 1 CSM per 45 accounts, fully loaded |
| **Gross margin at a $30 k ACV** | **~88 %** | $2.5 k MRR against ~$300 of delivery |

That 88 % is ordinary for infrastructure software and *below* what a pure-metadata GRC tool achieves, because Annex actually processes the customer's code. It is far above a consultancy, whose margin is bounded by the assessor's hourly rate — which is the point: the same deliverable, produced by a different cost structure.

**Customer acquisition.** Two motions, with very different numbers.

| | Self-serve (Team) | Sales-assisted (Conformity / Enterprise) |
|---|---|---|
| Entry | Free CLI and GitHub Action, then a card | Inbound from a failing free scan, or a security review |
| Blended CAC | **$400–900** | **$16–24 k** |
| Basis | Content and developer-community spend against a 2–4 % free-to-paid conversion | One AE and half an SE, fully loaded ~$280 k, closing 12–16 deals a year, plus ~$60 k of demand generation |
| Cycle | Days | **45–90 days** (Conformity), **3–6 months** (Enterprise) |
| Payback at ~88 % margin | Under 2 months | **7–11 months** |

The sales cycle is short for compliance software for one specific reason: the buyer is the VP of Engineering or the CISO, not the General Counsel. The tool installs as a GitHub App and produces a result before the first call ends. Legal is a reviewer, not the signer — which is what separates this from the 6–12 month cycle of an assessment engagement.

**Expansion is structural, not hoped for.** The account grows on three axes without a new sale: a new AI system enters the estate and is governed; a substantial modification re-opens a conformity assessment and consumes the artefact again; the trust page pulls the account into the customer's own sales process, where it stops being a compliance line item. A **115–130 % net revenue retention** is the planning assumption, and the honest caveat is that the first axis depends on estates growing, which they are, and the third is unproven by anybody.

**What has to be true.** At $30 k ACV, ~$20 k CAC and 88 % margin, an LTV/CAC of 3× needs roughly **2.5 years of retained revenue per logo**. That is the number to watch, and the one most likely to be wrong, because the AI Act's own deadlines create a cliff: an account that bought for 2 December 2026 and renewed for December 2027 has to find a third reason. Substantial-modification monitoring is that reason, and it is the part of the product that is hardest to copy.

## 7. Go to market

**Land** on what is live today and genuinely code-detectable: Article 50 transparency and the Art. 50(2) marking deadline of 2 December 2026. Not the Annex IV dossier — nobody buys a December 2027 deliverable in 2026.

**Expand:**
1. Free Article 50 check → one repo, GitHub App
2. → risk-tier classification across the whole org (appliedAI found **40 % of 106 enterprise AI systems could not be clearly classified** — that is the pain)
3. → Articles 9/10/12/14/15 control detection with remediation PRs
4. → Annex IV dossier + CDXA per governed system
5. → substantial-modification monitoring (the recurring event)
6. → **the trust page**, which is where Annex escapes the compliance budget and gets pulled in by sales
7. → the same detectors re-mapped to ISO 42001, NIST AI RMF, DORA, the CRA, SOC 2 AI criteria

Step 6 is the highest-value and the most under-served: no AI-governance vendor currently gives an AI vendor a credible, code-grounded artefact to hand a prospect's security reviewer.

## 8. Market size, stated honestly

Gartner (17 Feb 2026) puts **AI governance platform spending at $492 M in 2026**, passing **$1 bn by 2030**. Against $2.5 tn of total AI spending, governance is about 0.02 %.

Ninety vendors in a $492 M category implies a median vendor doing $2–5 M. Saidot raised €1.75 M in 2023 and is still seed-stage three years later. **This is not yet a standalone venture-scale category.** It becomes one as a module inside a larger GRC or AppSec platform — which is exactly why Vanta and Drata bolted ISO 42001 on rather than starting companies.

That is the honest read, and it changes the strategy rather than the product: build the wedge that a GRC or AppSec platform cannot build itself, because their architecture reads control-plane metadata and not code. They would have to buy it.

## 9. What would make me wrong

- **The Omnibus moves again.** It already moved once: Regulation (EU) 2026/1744 pushed Annex III high-risk from August 2026 to 2 December 2027 with the ink barely dry, and the pressure that produced it has not gone away. A second deferral, or a narrowing of Annex III, would take the urgency out of the Chapter III half of the product overnight. Two things blunt it. The first is that Article 50 was left untouched in the last round and is already in force, which is why the wedge is deliberately built there and not on the dossier. The second is that a deferral is a *deadline* change, not a *content* change — the obligations do not become easier to evidence, they become due later, and a tool that already evidences them is worth the same on the new date. What a deferral actually costs is a year of pipeline, which for a company at this stage is the whole thing; it is the strongest argument for the land motion being priced low enough to survive one.
- **The regulator commoditises the deliverable.** The Omnibus mandates the Commission to publish a *simplified Annex IV form for SMEs and start-ups* — free, official, aimed at the most adoptable segment. This is why Annex sells verification, not generation.
- **Code presence is not conformity, and assessors know it.** Detecting `recordInference()` does not prove logs are retained over the lifetime. If assessors treat code evidence as *supporting material* rather than as the dossier, the price ceiling drops. The counter is to sell assurance that the claims in the dossier are not fiction — which is unmet, because almost every AI Act dossier today is self-attested, and even the ones a notified body sees are checked as documents rather than against the code.
- **Platform bundling.** GitHub Advanced Security, GitLab Ultimate, Vanta or Drata could add an "AI Act" checkbox. The window is however long it takes them to decide code analysis is worth building — and Vanta's whole architecture means they would have to buy rather than build.
- **A frontier model makes the mapping trivial.** It already does, for *generation*. It does not for *verification*, and it never will, because the value of a verification is that it did not come from a model.

## 10. The one-sentence thesis

**Almost every AI Act dossier is self-attested, and the assessed minority is assessed as a document rather than against the code; Annex is the first thing that can check one against the system it describes, and the artefact it produces is the one an enterprise buyer is already asking AI vendors for.**

---

### Sources

[Gartner, AI governance platforms $492M→$1B](https://www.gartner.com/en/newsroom/press-releases/2026-02-17-gartner-global-ai-regulations-fuel-billion-dollar-market-for-ai-governance-platforms) · [IAPP AI Governance Vendor Report 2026](https://assets.contentstack.io/v3/assets/bltd4dd5b2d705252bc/blt386189207a33dc5d/ai_governance_vendor_report_2026.pdf) · [IAPP AI Governance Profession Report](https://iapp.org/resources/article/ai-governance-profession-report) · [Gibson Dunn on the AI Act Omnibus](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/) · [CEPS, Clarifying the costs](https://www.ceps.eu/clarifying-the-costs-for-the-eus-ai-act/) · [EC AI Act Service Desk](https://ai-act-service-desk.ec.europa.eu/en) · [CycloneDX Attestations (ECMA-424)](https://cyclonedx.org/capabilities/attestations/) · [JTC 21 prEN 18286](https://jtc21.eu/pren-18286-reaches-enquiry-stage-a-milestone-for-ai-quality-management-in-europe/) · [Semgrep Series D](https://www.prnewswire.com/news-releases/semgrep-announces-100m-series-d-funding-to-advance-ai-powered-code-security-302367780.html) · [Socket Series C](https://socket.dev/blog/series-c) · [Relyance AI](https://www.relyance.ai/solutions/ai-data-lineage-training-runtime) · [Systima Comply](https://systima.ai/blog/systima-comply-eu-ai-act-compliance-scanning)

Full research notes, including the reliability assessment of every figure above, are in [`docs/research/`](research/).
