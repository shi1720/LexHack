# EU AI Act — Research Report for a Repo-Scanning Compliance Tool
**Prepared: 15 September 2026** | Legal-tech research analyst

---

## ⚠️ READ THIS FIRST: YOUR TIMELINE PREMISE IS OUT OF DATE

The brief asked me to confirm "Aug 2, 2026 general application / high-risk Annex III; Aug 2, 2027 Annex I embedded high-risk." **Those two dates are no longer correct.** They were amended by the **Digital Omnibus on AI, Regulation (EU) 2026/1744**, which entered into force on **27 July 2026** — six days before the original high-risk deadline.

| Obligation | Original date | **Current date (Sept 2026)** |
|---|---|---|
| Annex III stand-alone high-risk (Art 6(2)) | 2 Aug 2026 | **2 December 2027** |
| Annex I embedded high-risk (Art 6(1)) | 2 Aug 2027 | **2 August 2028** |

If your scanner hard-codes 2026-08-02 as the high-risk compliance deadline, it is now wrong by ~16 months. Several other dates moved too (detailed in §1.3). **This is the single most important finding in this report.**

### Methodological caveat on sourcing
**EUR-Lex is behind AWS WAF bot protection and was not machine-retrievable during this research** (HTTP 202 challenge page on both `WebFetch` and `curl`). I could not read the primary OJ text of 2026/1744 directly. Instead I worked from:
1. The **consolidated, amendment-annotated full text** at `artificialintelligenceact.eu` (the Future of Life Institute's AI Act Explorer), which explicitly marks each provision `new` / `amended` / `Not present before the amendment` — this is how I verified the Omnibus changes clause-by-clause;
2. The **European Commission's own** `digital-strategy.ec.europa.eu` regulatory-framework page, which independently confirms the new dates;
3. Multiple independent law-firm analyses (Gibson Dunn, Hunton, Cooley, DLA Piper).

All three streams agree. I am **high confidence** on the dates and on the substance of Article 5/113 changes. I am **lower confidence** on a few narrower Omnibus details, flagged inline with 🚩.

---

## 1. REGULATION IDENTITY

### 1.1 The AI Act itself

**Full formal name:**
> Regulation (EU) 2024/1689 of the European Parliament and of the Council of 13 June 2024 laying down harmonised rules on artificial intelligence and amending Regulations (EC) No 300/2008, (EU) No 167/2013, (EU) No 168/2013, (EU) 2018/858, (EU) 2018/1139 and (EU) 2019/2144 and Directives 2014/90/EU, (EU) 2016/797 and (EU) 2020/1828 (Artificial Intelligence Act)

- **Short citation:** Regulation (EU) 2024/1689; "the AI Act"
- **OJ citation:** OJ L, 2024/1689, 12.7.2024
- **ELI:** http://data.europa.eu/eli/reg/2024/1689/oj
- **Date of adoption:** 13 June 2024
- **Date of OJ publication:** 12 July 2024
- **Entry into force:** **1 August 2024** (Art 113, first para: "the twentieth day following that of its publication")
- Source: https://eur-lex.europa.eu/eli/reg/2024/1689/oj | https://artificialintelligenceact.eu/article/113/

### 1.2 The amending act — Digital Omnibus on AI

**Full formal name (as reported by secondary sources; 🚩 I could not read the OJ text directly):**
> Regulation (EU) 2026/1744 of the European Parliament and of the Council of 8 July 2026 amending Regulations (EU) 2024/1689, (EU) 2018/1139 and (EU) 2023/1230 as regards the simplification of the implementation of harmonised rules on artificial intelligence (Digital Omnibus on AI)

- **Adopted:** 8 July 2026
- **OJ publication:** 24 July 2026
- **Entry into force:** **27 July 2026**
- **ELI:** http://data.europa.eu/eli/reg/2026/1744/oj
- **Legislative history:** Commission proposal 19 November 2025 → political agreement 7 May 2026 → adoption 8 July 2026 (per the Commission's own page)
- Sources: https://eur-lex.europa.eu/eli/reg/2026/1744/oj | https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai | https://www.hunton.com/privacy-and-cybersecurity-law-blog/eu-digital-omnibus-on-ai-enters-into-force | https://lawandtechnology.eu/en/digital-omnibus-on-ai-official-journal-regulation-2026-1744/

### 1.3 The staged application timeline — AS IT STANDS TODAY

This is **Article 113 as amended**. I reproduce the operative structure, with `[NEW]` / `[AMENDED]` markers matching the consolidated text:

| Date | What applies | Legal basis |
|---|---|---|
| **1 Aug 2024** | Entry into force. Nothing yet applies substantively. | Art 113 ¶1 |
| **2 Feb 2025** | **Chapter I** (general provisions — incl. **Art 3 definitions, Art 4 AI literacy**) and **Chapter II** (**Art 5 prohibited practices**) | Art 113(a) |
| **2 Aug 2025** | **Ch. III Section 4** (notifying authorities/notified bodies), **Ch. V** (**GPAI — Arts 51–56**), **Ch. VII** (governance — AI Office, AI Board), **Ch. XII** (**penalties — Art 99**), and **Art 78** (confidentiality). **Art 101 (GPAI fines) expressly excluded** from this date. | Art 113(b) |
| **27 Jul 2026** | `[NEW]` **Arts 102–110** (the consequential amendments to sectoral product legislation) | Art 113(d) `[NEW]` |
| **2 Aug 2026** | **General application date** — everything not otherwise carved out. Includes **Ch. IV / Art 50 transparency**, Art 6(5), Arts 40, 43, 47, 48, 49, 71, 72, 73, Art 101. | Art 113 ¶2 |
| **2 Dec 2026** | `[NEW]` **Art 5(1) points (ba) and (bb)** (NCII / CSAM prohibitions) + **Art 5(1a), (1b)**. Also **Art 111(4)** `[NEW]`: Art 50(2) marking compliance deadline for generative systems already on market before 2 Aug 2026. | Art 113(a) as amended; Art 111(4) |
| **2 Dec 2027** | `[AMENDED]` **Ch. III Sections 1, 2 and 3** (Arts 6–27, excluding Art 6(5)) **as regards Annex III high-risk systems** (Art 6(2)) | Art 113(c)(i) `[NEW]` |
| **2 Aug 2028** | `[NEW]` **Ch. III Sections 1, 2 and 3 as regards Annex I high-risk systems** (Art 6(1)) | Art 113(c)(ii) `[NEW]` |

**Verbatim from the consolidated Art 113 (amended text shown, struck text in brackets):**
> (a) Chapters I and II shall apply from 2 February 2025, **with the exception of Article 5(1), first subparagraph, points (ba) and (bb), and Article 5(1a) and (1b) which shall apply from 2 December 2026**; [~~Chapters I and II shall apply from 2 February 2025~~] — *amended*
> (c) Chapter III, Sections 1, 2, and 3, with the exception of Article 6(5), shall apply from: [~~Article 6(1) and the corresponding obligations in this Regulation shall apply from 2 August 2027~~] — *amended*
>   (i) **2 December 2027** as regards AI systems classified as high-risk pursuant to Article 6(2) and Annex III; and — *new*
>   (ii) **2 August 2028** as regards AI systems classified as high-risk pursuant to Article 6(1) and Annex I; — *new*
> (d) **Articles 102 to 110 shall apply from 27 July 2026.** — *new*

Source: https://artificialintelligenceact.eu/article/113/

**Critical practical point for your tool:** Art 50 transparency obligations **were NOT delayed** — they took effect 2 August 2026 and are live *now*. For a startup wrapping an LLM API, Art 50 + Art 4 + Art 5 are the obligations that bite **today**; the high-risk machinery is a 2027/2028 problem. Your tool should present this split clearly.

### 1.4 Other transitional rules (Art 111)
- **Art 111(1):** AI systems that are components of large-scale EU IT systems (Annex X) placed on market before 2 Aug 2027 → compliance by **31 December 2030**.
- **Art 111(2)** `[AMENDED]`: High-risk systems placed on market **before the Ch. III application date** are only caught if **"subject to significant changes in their designs"** after that date. Public-authority high-risk systems must comply by **2 August 2030** regardless. *(The Omnibus replaced the hard-coded "before 2 August 2026" with a dynamic reference to "the date of application of Chapter III referred to in Article 113".)* — **This is a major grandfathering provision your scanner should surface.**
- **Art 111(3):** GPAI models placed on market before 2 Aug 2025 → compliance by **2 August 2027**.
- **Art 111(4)** `[NEW]`: Providers of generative systems placed on market before 2 Aug 2026 → comply with **Art 50(2)** by **2 December 2026**.

Source: https://artificialintelligenceact.eu/article/111/

### 1.5 Other Omnibus changes worth knowing
- **Art 6(1a)–(1c)** `[NEW]`: narrows "safety component" — systems used *solely* for "non-safety related aspects of user assistance, performance optimisation, service efficiency, automation or convenience or quality control" **do not qualify as safety components** (1a); but systems whose failure "would endanger health and safety" **do** (1b); and products needing third-party assessment *solely* for non-health/safety risks (e.g. radio spectrum/EMC) don't trigger Art 6(1)(b) (1c).
- **Art 4** softened: now "take measures to **support the development of** AI literacy" and expressly "**does not require providers or deployers to guarantee any specific level of AI literacy of any individual**" (was: "ensure, to their best extent, a sufficient level").
- **Art 11(1)** extended simplified technical documentation to **SMCs** (small mid-cap companies) alongside SMEs/start-ups.
- **Art 25(2)** expanded with a concrete `[NEW]` list of what an initial provider must hand over (see §8).
- **Art 43(3)** `[NEW]`: notified bodies under Annex I Section A legislation must apply for AI Act designation **by 28 January 2028**.
- **Art 72(3)** `[AMENDED]`: post-market monitoring plan template now due as **Commission guidance by 2 September 2027** (was: implementing act by 2 February 2026).
- **AI regulatory sandboxes** (Art 57): establishment deadline moved to **2 August 2027**. 🚩 *Reported consistently by law firms; I did not read Art 57 directly.*
- **Annex I Section A point 1** (Machinery Directive 2006/42/EC) removed; **new point 21** adds Machinery **Regulation (EU) 2023/1230**.
- **Annex III appears UNCHANGED** by the Omnibus — the consolidated text shows no `new`/`amended` markers anywhere in Annex III. **Annex IV likewise appears unchanged.** (Good news for your document generator.)

Sources: https://artificialintelligenceact.eu/article/6/ | /article/4/ | /article/11/ | /article/43/ | /article/72/ | /annex/1/

---

## 2. RISK TIERS

### 2.1 Unacceptable risk — Article 5

**There are now TEN prohibited practices, not eight.** The original eight are (a)–(h); the Omnibus inserted **(ba)** and **(bb)**, applicable from **2 December 2026**.

| Pt | Practice | Applies from |
|---|---|---|
| **(a)** | **Subliminal / manipulative / deceptive techniques** — placing on market, putting into service or using an AI system that deploys subliminal techniques beyond a person's consciousness, or purposefully manipulative or deceptive techniques, with the objective or effect of materially distorting behaviour by appreciably impairing the ability to make an informed decision, causing a decision they would not otherwise have taken, in a manner causing or reasonably likely to cause **significant harm**. | 2 Feb 2025 |
| **(b)** | **Exploitation of vulnerabilities** — exploiting vulnerabilities due to **age, disability, or a specific social or economic situation**, with the objective or effect of materially distorting behaviour in a manner causing or reasonably likely to cause significant harm. | 2 Feb 2025 |
| **(ba)** `[NEW]` | **Non-consensual intimate imagery ("nudifiers")** — AI that generates or manipulates realistic images, videos, audio or similar material of an identifiable natural person's **intimate parts**, or of an identifiable person **engaged in sexually explicit activities**, without that person's freely-given, specific, informed, unambiguous and explicit consent. | **2 Dec 2026** |
| **(bb)** `[NEW]` | **Child sexual abuse material** — AI that generates or manipulates material or performance within the meaning of Art 2(c) and (e) of **Directive 2011/93/EU**, except where a "without right" defence applies under national law. | **2 Dec 2026** |
| **(c)** | **Social scoring** — evaluation/classification of persons over time based on social behaviour or known, inferred or predicted personal/personality characteristics, where the social score leads to **(i)** detrimental treatment in social contexts unrelated to the context of original data collection, and/or **(ii)** detrimental treatment that is unjustified or disproportionate to the social behaviour or its gravity. | 2 Feb 2025 |
| **(d)** | **Individual criminal-offence risk prediction** — assessing/predicting the risk of a person committing a criminal offence **based solely on profiling or on assessing personality traits and characteristics**. *Carve-out:* does not apply to systems **supporting** human assessment already based on objective, verifiable facts directly linked to criminal activity. | 2 Feb 2025 |
| **(e)** | **Untargeted facial-image scraping** — creating or expanding facial recognition databases through untargeted scraping of facial images from the **internet or CCTV footage**. | 2 Feb 2025 |
| **(f)** | **Emotion inference in workplace / education** — inferring emotions of a natural person in the areas of **workplace and education institutions**. *Carve-out:* **medical or safety reasons**. | 2 Feb 2025 |
| **(g)** | **Biometric categorisation for sensitive attributes** — categorising individuals based on biometric data to deduce/infer **race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation**. *Carve-out:* labelling/filtering of lawfully acquired biometric datasets, and categorising of biometric data in law enforcement. | 2 Feb 2025 |
| **(h)** | **'Real-time' remote biometric identification in publicly accessible spaces for law enforcement**, unless strictly necessary for: **(i)** targeted search for victims of abduction/trafficking/sexual exploitation or missing persons; **(ii)** prevention of a specific, substantial and imminent threat to life or physical safety, or a genuine and present/foreseeable terrorist attack; **(iii)** localisation/identification of a suspect for an **Annex II** offence punishable by ≥4 years custody. | 2 Feb 2025 |

**Art 5(1a)** `[NEW]`, scoping (ba)/(bb) — important for API-wrapper startups:
- **(a)** Placing on market/putting into service is prohibited only where **(i)** that generation/manipulation is the system's **intended purpose**; **or (ii)** the system's "design, training, architecture, capabilities or user-facing functionalities make that generation or manipulation a **reasonably foreseeable and reproducible outcome, without requiring significant technical modification**, and the system does not have reasonable and adequate technical safety measures and other safeguards to reliably prevent" it, taking account of reasonably foreseeable misuse and correcting observed/reported misuse.
- **(b)** **Use** is prohibited only where the **deployer uses the system for the purpose** of generating such material.

**Art 5(1b)** `[NEW]`: for (ba), manipulation that "does not increase the exposure of any depicted intimate parts or alter the nature of any depicted sexually explicit activities" is **not** manipulation.

**Art 5(2)–(7)** set out the safeguard regime for point (h): necessity/proportionality assessment (¶2), **prior judicial or independent administrative authorisation** with a 24-hour urgency window (¶3), notification to market surveillance + DPA (¶4), Member State enabling law (¶5), annual reporting (¶6–7). **Note Art 5(2) cross-links to Art 27 FRIA and Art 49 registration** as preconditions. **Art 5(8):** the Article doesn't affect prohibitions arising under other Union law.

Source: https://artificialintelligenceact.eu/article/5/

### 2.2 High risk — Article 6

**Two routes:**

**Route 1 — Art 6(1): Annex I embedded (applies 2 Aug 2028).** Both conditions must be met:
- (a) the AI system is intended to be used as a **safety component** of a product, **or is itself a product**, covered by the Union harmonisation legislation in **Annex I**; **and**
- (b) that product is required to undergo a **third-party conformity assessment** under that Annex I legislation.

Plus the new Omnibus filters **6(1a)/(1b)/(1c)** described in §1.5.

**Annex I structure:**
- **Section A** (New Legislative Framework acts, points 1–12): toys (2009/48/EC), recreational craft (2013/53/EU), lifts (2014/33/EU), ATEX (2014/34/EU), radio equipment (2014/53/EU), pressure equipment (2014/68/EU), cableways (2016/424), PPE (2016/425), gas appliances (2016/426), **medical devices (2017/745)**, **IVDs (2017/746)**. Point 1 (old Machinery Directive) removed; **new point 21 = Machinery Regulation (EU) 2023/1230**.
- **Section B** (other acts, points 13–20): civil aviation security (300/2008), two/three-wheel vehicles (168/2013), agricultural vehicles (167/2013), marine equipment (2014/90/EU), rail interoperability (2016/797), motor vehicles (2018/858), vehicle general safety (2019/2144), **EASA (2018/1139)** for unmanned aircraft.

**Route 2 — Art 6(2): Annex III listed use cases (applies 2 Dec 2027).**

### 2.3 Annex III — all 8 categories with sub-points

> *Chapeau:* "High-risk AI systems pursuant to Article 6(2) are the AI systems listed in any of the following areas:"

**1. Biometrics** *(in so far as their use is permitted under relevant Union or national law)*
- (a) **Remote biometric identification systems.** *Excludes* systems for **biometric verification** whose sole purpose is confirming a person is who they claim to be.
- (b) Biometric **categorisation** according to sensitive or protected attributes/characteristics based on inference of those attributes.
- (c) **Emotion recognition.**

**2. Critical infrastructure** *(no sub-points — single provision)*
- AI intended to be used as **safety components** in the management and operation of **critical digital infrastructure, road traffic, or the supply of water, gas, heating or electricity**.

**3. Education and vocational training**
- (a) Determining **access or admission**, or assigning persons to educational/VET institutions at all levels.
- (b) **Evaluating learning outcomes**, including where used to steer the learning process.
- (c) Assessing the **appropriate level of education** an individual will receive or be able to access.
- (d) **Monitoring and detecting prohibited behaviour of students during tests** (proctoring).

**4. Employment, workers' management and access to self-employment**
- (a) **Recruitment or selection** — in particular to place targeted job advertisements, analyse and filter job applications, and evaluate candidates.
- (b) Decisions affecting **terms of work-related relationships, promotion or termination**, **task allocation** based on individual behaviour or personal traits/characteristics, or **monitoring and evaluating performance and behaviour**.

**5. Access to and enjoyment of essential private services and essential public services and benefits**
- (a) Used by/on behalf of **public authorities** to evaluate **eligibility for essential public assistance benefits and services, including healthcare**, and to grant, reduce, revoke or reclaim them.
- (b) Evaluating **creditworthiness** or establishing **credit score**. *Excludes* systems used for **detecting financial fraud**.
- (c) **Risk assessment and pricing** in relation to natural persons for **life and health insurance**.
- (d) Evaluating and classifying **emergency calls**, or dispatching / establishing priority in dispatching **emergency first response services** (police, firefighters, medical aid), including **emergency healthcare patient triage**.

**6. Law enforcement** *(in so far as permitted under relevant Union or national law)*
- (a) Assessing the risk of a person **becoming a victim** of criminal offences.
- (b) **Polygraphs or similar tools.**
- (c) Evaluating the **reliability of evidence** in investigation/prosecution.
- (d) Assessing the risk of a person **offending or re-offending** not solely on the basis of profiling (Art 3(4) Dir (EU) 2016/680), or assessing personality traits/characteristics or past criminal behaviour.
- (e) **Profiling** of natural persons (Art 3(4) Dir (EU) 2016/680) in the course of detection, investigation or prosecution.

**7. Migration, asylum and border control management** *(in so far as permitted...)*
- (a) **Polygraphs or similar tools.**
- (b) Assessing a **risk** — security risk, risk of irregular migration, or health risk — posed by a person intending to enter or who has entered a Member State.
- (c) Assisting competent authorities in examining **applications for asylum, visa or residence permits** and associated complaints, including assessments of reliability of evidence.
- (d) **Detecting, recognising or identifying** natural persons in the migration/asylum/border context. *Excludes* verification of travel documents.

**8. Administration of justice and democratic processes**
- (a) Used by/on behalf of a **judicial authority** to assist in **researching and interpreting facts and the law and applying the law to a concrete set of facts**, or used similarly in **alternative dispute resolution**.
- (b) **Influencing the outcome of an election or referendum or the voting behaviour** of natural persons. *Excludes* systems whose output natural persons are not directly exposed to, such as tools to organise, optimise or structure political campaigns administratively or logistically.

Source: https://artificialintelligenceact.eu/annex/3/

### 2.4 Art 6(3) — the derogation filter

An Annex III system is **NOT** high-risk where it **does not pose a significant risk of harm to health, safety or fundamental rights of natural persons, including by not materially influencing the outcome of decision making**, AND **any one** of these four conditions is met:

- **(a)** intended to perform a **narrow procedural task**;
- **(b)** intended to **improve the result of a previously completed human activity**;
- **(c)** intended to **detect decision-making patterns or deviations from prior decision-making patterns** and **not meant to replace or influence the previously completed human assessment, without proper human review**;
- **(d)** intended to perform a **preparatory task** to an assessment relevant for an Annex III use case.

**Hard override:** "Notwithstanding the first subparagraph, an AI system referred to in Annex III shall **always** be considered to be high-risk where the AI system performs **profiling of natural persons**." — This is absolute; no Art 6(3) condition can rescue a profiling system. **Your scanner should treat "does this profile natural persons?" as a terminating question.**

Art 6(6)–(8): Commission may add/modify conditions by delegated act (6), must delete conditions where necessary to maintain protection (7), and no amendment may decrease the overall level of protection (8).

### 2.5 Art 6(4) — the documentation + registration duty when you self-assess out

> "A provider who considers that an AI system referred to in Annex III is not high-risk shall **document its assessment before that system is placed on the market or put into service**. Such provider shall be subject to the **registration obligation set out in Article 49(2)**. Upon request of national competent authorities, the provider shall provide the documentation of the assessment."

**Three concrete duties, and this is a compliance trap:** (1) a written assessment, (2) **completed before** placing on market, (3) **registration in the EU database anyway** (Art 49(2)). Claiming the derogation is *not* an exit from the regime — it is an alternative, lighter regime with its own paperwork.

**Guidelines status:** Art 6(5) required Commission guidelines with practical examples by **2 February 2026**. These were **delayed**; the Commission published **draft guidelines on 19 May 2026** (three documents: general principles; Annex I product context; Annex III use cases) with consultation to **23 June 2026**. 🚩 **I could not confirm whether the final guidelines have been adopted as of Sept 2026** — your tool should check this, as the examples will be directly usable as classification heuristics.
Sources: https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems | https://www.dlapiper.com/en/insights/publications/2026/06/eu-commission-draft-guidelines-on-classification-of-high-risk-ai-systems-key-points

### 2.6 Limited / transparency risk — Article 50 (see §7) and minimal risk

**Minimal risk** is not a defined statutory tier — it is the residual category of systems that are neither prohibited, high-risk, nor caught by Art 50. **No mandatory obligations** under the AI Act, **except Art 4 AI literacy, which applies to providers and deployers of *all* AI systems regardless of tier.** Voluntary codes of conduct are encouraged under **Art 95**.

---

## 3. PROVIDER OBLIGATIONS FOR HIGH-RISK SYSTEMS

**All of Arts 8–27 now apply from 2 Dec 2027 (Annex III) / 2 Aug 2028 (Annex I). Arts 43, 47, 48, 49, 72, 73 sit outside Ch. III Sections 1–3 and formally applied from 2 Aug 2026 — but they are operationally meaningless until the systems they govern become regulated.** 🚩 This split is a genuine oddity of the amended Art 113; treat Arts 43/47/48/49/72/73 as effectively bound to the Ch. III dates in practice.

### Section 2 — Requirements (what the system must be)

| Art | Official title | What it concretely requires |
|---|---|---|
| **8** | **Compliance with the Requirements** | High-risk systems must meet all Section 2 requirements, taking account of **intended purpose** and the **generally acknowledged state of the art**; the Art 9 risk management system is the vehicle for ensuring this. Where a product is covered by both the AI Act and Annex I Section A legislation, the provider ensures full compliance with both and **may integrate** AI Act testing/reporting/documentation into existing sectoral documentation to avoid duplication. |
| **9** | **Risk Management System** | Establish, implement, document and maintain a **continuous iterative process across the entire lifecycle**, with regular systematic review and updating. Four steps (¶2): **(a)** identify and analyse known and reasonably foreseeable risks to health, safety, fundamental rights under intended purpose; **(b)** estimate and evaluate risks under intended purpose **and under reasonably foreseeable misuse**; **(c)** evaluate other risks from **Art 72 post-market monitoring data**; **(d)** adopt appropriate and targeted risk management measures. Only risks reasonably mitigable through design/development or technical information are in scope (¶3). Residual risk per-hazard **and overall** must be judged **acceptable** (¶5), pursuing in order: elimination/reduction by design → mitigation/control measures → **information under Art 13 and, where appropriate, training to deployers**. **Testing is mandatory** (¶6–8): against **pre-defined metrics and probabilistic thresholds** appropriate to the intended purpose, at any time during development and **in any event before placing on the market**; may include testing in real-world conditions under Arts 57/60. |
| **10** | **Data and Data Governance** | Training, validation and testing datasets must meet quality criteria. **¶2 — eight governance practices:** (a) relevant design choices; (b) **data collection processes and the origin of data**, and for personal data the **original purpose of collection**; (c) data-preparation operations (annotation, labelling, cleaning, updating, enrichment, aggregation); (d) formulation of **assumptions** about what the data is supposed to measure and represent; (e) assessment of **availability, quantity and suitability**; (f) **examination for possible biases** likely to affect health/safety, negatively impact fundamental rights or lead to prohibited discrimination, **especially where outputs influence inputs for future operations**; (g) measures to **detect, prevent and mitigate** those biases; (h) identification of **data gaps or shortcomings** and how they can be addressed. **¶3:** datasets must be **relevant, sufficiently representative, and to the best extent possible free of errors and complete** in view of intended purpose, with appropriate statistical properties (may be met at individual dataset level or in combination). **¶4:** account for characteristics particular to the specific **geographical, contextual, behavioural or functional setting**. 🚩 **¶5 (special-category personal data for bias detection) is marked "Not present after the amendment"** in the consolidated text, and ¶1 now cross-references a **new "Article 4a(1)"** — the Omnibus appears to have relocated the bias-detection derogation into a new Article 4a. I could not retrieve Art 4a (404 on the explorer). **Flagging as uncertain — verify before building.** |
| **11** | **Technical Documentation** | Draw up **before** placing on market/putting into service and **keep up to date**. Must demonstrate Section 2 compliance and give national competent authorities and notified bodies the information "in a clear and comprehensive form" to assess compliance. **Must contain at a minimum the elements in Annex IV.** `[AMENDED]` **SMEs, start-ups and SMCs** may supply Annex IV elements **in a simplified manner** using a Commission-provided simplified form, which **notified bodies must accept**. ¶2: single set of documentation where Annex I Section A legislation also applies. ¶3: Commission may amend Annex IV by delegated act. |
| **12** | **Record-Keeping** | The system must **technically allow automatic recording of events (logs) over its lifetime**. Logging must enable recording of events relevant to: **(a)** identifying situations that may result in an Art 79(1) risk or a **substantial modification**; **(b)** facilitating **Art 72 post-market monitoring**; **(c)** monitoring operation under **Art 26(5)**. **¶3 — for Annex III point 1(a) (remote biometric ID) specifically, minimum log contents:** (a) **start and end date and time of each use**; (b) the **reference database** against which input data was checked; (c) the **input data for which the search led to a match**; (d) **identification of the natural persons involved in verifying the results** per Art 14(5). |
| **13** | **Transparency and Provision of Information to Deployers** | Design for **sufficient transparency to enable deployers to interpret output and use it appropriately** (¶1). Must be accompanied by **instructions for use** in an appropriate **digital format or otherwise**, that are "concise, complete, correct and clear," relevant, accessible and comprehensible (¶2). **¶3 minimum contents:** (a) **identity and contact details of provider** and authorised representative; (b) characteristics, capabilities and **limitations of performance**, including **(i)** intended purpose, **(ii)** the **level of accuracy including its metrics**, robustness and cybersecurity against which tested and validated, plus circumstances that may affect it, **(iii)** known/foreseeable circumstances under intended use or reasonably foreseeable misuse that may lead to Art 9(2) risks, **(iv)** technical capabilities to **explain output**, **(v)** performance regarding **specific persons or groups**, **(vi)** specifications for **input data** and info on training/validation/testing sets, **(vii)** information enabling deployers to **interpret output**; (c) **pre-determined changes** to system and performance fixed at initial conformity assessment; (d) the **Art 14 human oversight measures**, including technical measures to facilitate interpretation of outputs; (e) **computational and hardware resources needed, expected lifetime, maintenance and care measures and their frequency**, including software updates; (f) mechanisms allowing deployers to **collect, store and interpret the Art 12 logs**. |
| **14** | **Human Oversight** | Design and develop — **including with appropriate human-machine interface tools** — so the system can be **effectively overseen by natural persons while in use** (¶1), to prevent or minimise risks to health, safety and fundamental rights (¶2). Measures must be **commensurate with risks, level of autonomy and context**, delivered as **(a)** measures built into the system by the provider and/or **(b)** measures identified by the provider as appropriate for the **deployer** to implement (¶3). **¶4 — the overseer must be enabled, as appropriate and proportionate, to:** (a) **properly understand capacities and limitations** and monitor operation, detecting anomalies, dysfunctions and unexpected performance; (b) **remain aware of automation bias** (the tendency to over-rely on output), particularly for recommendation systems; (c) **correctly interpret the output**, given available interpretation tools and methods; (d) **decide not to use the system, or disregard, override or reverse the output**; (e) **intervene or interrupt through a 'stop' button or similar procedure bringing the system to a halt in a safe state**. **¶5 — four-eyes rule:** for **Annex III point 1(a)** (remote biometric ID), **no action or decision may be taken on the basis of an identification unless separately verified and confirmed by at least two natural persons** with necessary competence, training and authority — disapplied for law enforcement/migration/border/asylum where Union or national law deems it disproportionate. |
| **15** | **Accuracy, Robustness and Cybersecurity** | Achieve an **appropriate level** of accuracy, robustness and cybersecurity and **perform consistently in those respects throughout the lifecycle** (¶1). **Declared accuracy levels and relevant accuracy metrics must be stated in the instructions for use** (¶3). **Robustness** (¶4): as resilient as possible to errors, faults or inconsistencies within the system or its environment, via technical and organisational measures; may use **technical redundancy — backup or fail-safe plans**; systems that **continue to learn after deployment** must be designed to eliminate or reduce **feedback loops** of biased outputs influencing future inputs, with appropriate mitigation. **Cybersecurity** (¶5): resilient against unauthorised third parties altering use, outputs or performance by exploiting vulnerabilities; AI-specific measures must include, where appropriate, measures to prevent/detect/respond to/resolve/control **data poisoning, model poisoning (of pre-trained components), adversarial examples / model evasion, confidentiality attacks, and model flaws**. ¶2: Commission to encourage development of benchmarks and measurement methodologies. |

### Section 3 — Obligations (what the provider organisation must do)

| Art | Official title | What it concretely requires |
|---|---|---|
| **16** | **Obligations of Providers of High-Risk AI Systems** | The master checklist — 12 duties (a)–(l): **(a)** ensure Section 2 compliance; **(b)** indicate **name, registered trade name/trade mark and contact address** on the system, packaging or accompanying documentation; **(c)** have an **Art 17 QMS**; **(d)** keep **Art 18 documentation**; **(e)** keep **Art 19 logs** when under their control; **(f)** undergo the **Art 43 conformity assessment before placing on market**; **(g)** draw up the **Art 47 EU declaration of conformity**; **(h)** affix the **Art 48 CE marking**; **(i)** comply with **Art 49(1) registration**; **(j)** take **Art 20 corrective actions** and provide information; **(k)** on reasoned request of a national competent authority, **demonstrate conformity**; **(l)** ensure **accessibility** per Directives (EU) 2016/2102 and (EU) 2019/882. |
| **17** | **Quality Management System** | Put a QMS in place ensuring compliance, **documented systematically and orderly in written policies, procedures and instructions**, covering at least **13 aspects (a)–(m)**: (a) **regulatory compliance strategy**, incl. conformity assessment and **management of modifications**; (b) design, design control and design verification techniques; (c) development, quality control and quality assurance techniques; (d) **examination, test and validation procedures** before/during/after development **and their frequency**; (e) **technical specifications including standards** to be applied, and where harmonised standards are not applied in full, the means used to ensure compliance; (f) **data management systems and procedures** — acquisition, collection, analysis, labelling, storage, filtration, mining, aggregation, retention; (g) the **Art 9 risk management system**; (h) setting up, implementing and maintaining an **Art 72 post-market monitoring system**; (i) procedures for **Art 73 serious incident reporting**; (j) handling communication with authorities, notified bodies, other operators, customers; (k) **record-keeping systems and procedures**; (l) **resource management including security-of-supply measures**; (m) an **accountability framework** setting out management and staff responsibilities. **¶2** `[AMENDED]`: implementation must be **proportionate to the size of the provider's organisation, in particular for SMEs including start-ups, and SMCs** — but providers must "in any event respect the degree of rigour and the level of protection required." |
| **18** | **Documentation Keeping** | Keep at the disposal of national competent authorities **for 10 years after placing on market / putting into service**: (a) **Art 11 technical documentation**; (b) **Art 17 QMS documentation**; (c) documentation of **changes approved by notified bodies**; (d) **decisions and other documents issued by notified bodies**; (e) the **Art 47 EU declaration of conformity**. ¶2: Member States determine how documentation stays available if the provider goes **bankrupt or ceases activity**. ¶3: financial institutions may hold it within their financial-services documentation. |
| **19** | **Automatically Generated Logs** | Keep the **Art 12(1)** logs automatically generated by the system, **to the extent they are under the provider's control**, for a period **appropriate to the intended purpose and of at least six months**, unless Union or national law (in particular data protection law) provides otherwise. ¶2: financial institutions maintain them as part of financial-services documentation. **→ Answer to your specific question: the minimum retention period is SIX MONTHS.** (Same six-month floor applies to deployers under Art 26(6).) |
| **20** | **Corrective Actions and Duty of Information** | A provider who considers, or has reason to consider, that a system it placed on market is **not in conformity** must **immediately** take necessary corrective actions to bring it into conformity, **withdraw it, disable it, or recall it**, and inform **distributors and, where applicable, deployers, the authorised representative and importers**. ¶2: where the system presents an **Art 79(1) risk** and the provider becomes aware, it must **immediately investigate the causes** (in collaboration with the reporting deployer) and inform the competent **market surveillance authorities** and, where applicable, the **notified body that issued the Art 44 certificate**, of the nature of the non-compliance and corrective action taken. |
| **21** | **Cooperation with Competent Authorities** | On **reasoned request** by a competent authority, provide **all information and documentation necessary to demonstrate conformity** with Section 2, **in a language easily understood by the authority**, being an official EU language indicated by the Member State (¶1). Also give the authority **access to the Art 12(1) automatically generated logs**, to the extent under the provider's control (¶2). Information obtained is subject to the **Art 78 confidentiality** regime (¶3). |

### Deployer-side (asked for specifically)

| Art | Official title | What it concretely requires |
|---|---|---|
| **26** | **Obligations of Deployers of High-Risk AI Systems** | **¶1** Take appropriate **technical and organisational measures** to ensure use **in accordance with the instructions for use**. **¶2** **Assign human oversight to natural persons with the necessary competence, training and authority, as well as the necessary support.** **¶4** To the extent the deployer **controls the input data**, ensure it is **relevant and sufficiently representative** in view of the intended purpose. **¶5** **Monitor operation** on the basis of the instructions and, where relevant, inform providers per Art 72. Where the deployer has reason to consider that use in accordance with the instructions may result in an **Art 79(1) risk**, it must **without undue delay inform the provider or distributor and the relevant market surveillance authority, AND suspend use of the system**. On identifying a **serious incident**, immediately inform **first the provider, then the importer/distributor and the market surveillance authorities**; if the provider cannot be reached, **Art 73 applies mutatis mutandis**. **¶6** **Keep the automatically generated logs under its control for at least six months** (same floor as Art 19). **¶7** **Workplace notice:** deployers who are **employers** must, **before putting into service or using** a high-risk system at the workplace, **inform workers' representatives and the affected workers** that they will be subject to its use. **¶8** Public-authority deployers must comply with **Art 49 registration**, and **must not use** a high-risk system they find is **not registered** in the EU database — and must inform the provider or distributor. *(Later paragraphs cover GDPR interaction, law-enforcement post-remote-biometric-ID authorisation, and the duty to inform affected persons of decisions taken with a high-risk system.)* |
| **27** | **Fundamental Rights Impact Assessment for High-Risk AI Systems** | **WHO must do it** — only these deployers, and only for **Art 6(2)/Annex III** systems, **excluding Annex III point 2 (critical infrastructure)**: (i) deployers that are **bodies governed by public law**; (ii) **private entities providing public services**; (iii) **any deployer** of **Annex III points 5(b) (creditworthiness/credit scoring) and 5(c) (life and health insurance risk assessment and pricing)**. **→ A private-sector deployer generally does NOT owe a FRIA, with the two banking/insurance exceptions.** **Contents (¶1):** (a) description of the deployer's **processes** in which the system will be used per its intended purpose; (b) the **period of time and frequency** of intended use; (c) **categories of natural persons and groups likely to be affected**; (d) the **specific risks of harm** to those categories, taking into account the **Art 13 information from the provider**; (e) description of implementation of **human oversight measures** per the instructions for use; (f) **measures to be taken if risks materialise**, including **internal governance arrangements and complaint mechanisms**. **¶2:** obligation attaches to **first use**; may rely on previously conducted FRIAs or existing provider assessments in similar cases; must update if elements change. **¶3:** **notify the market surveillance authority of the results**, submitting the filled-out template (exemption possible in Art 46(1) cases). **¶4:** may **cross-reference or incorporate** a GDPR Art 35 / LED Art 27 DPIA where it already meets the obligations. |

### Conformity, marking, registration, post-market

| Art | Official title | What it concretely requires |
|---|---|---|
| **43** | **Conformity Assessment** | **¶1 — Annex III point 1 (biometrics) only:** if the provider **applied harmonised standards or common specifications**, it may choose **(a) internal control (Annex VI)** or **(b) QMS + technical documentation assessment with notified body involvement (Annex VII)**. It **must** use **Annex VII (notified body)** where: (a) harmonised standards don't exist and common specifications aren't available; (b) the provider didn't apply, or only partly applied, the harmonised standard; (c) common specifications exist but weren't applied; (d) a harmonised standard was published **with a restriction**, and only as to the restricted part. Where the system is to be put into service by **law enforcement, immigration or asylum authorities or EU institutions**, the **market surveillance authority acts as the notified body**. **¶2 — Annex III points 2 to 8: internal control (Annex VI) only — NO notified body.** **¶3 — Annex I Section A products:** follow the **sectoral** conformity assessment procedure, with Section 2 requirements folded into it; `[AMENDED]` the **Art 17 QMS assessment must also be undertaken**, and **Annex VII points 3, 4.3, 4.4, 4.5, fifth para of 4.6, and point 5 apply**. `[NEW]` Sectoral notified bodies may assess AI Act conformity subject to Art 31(4),(5),(10),(11), but **must apply for AI Act designation by 28 January 2028**. Self-assessment options in sectoral law may only be used if harmonised standards/common specifications covering **all** Section 2 requirements were also applied. **→ Practical upshot: the overwhelming majority of Annex III high-risk systems (points 2–8) self-certify via internal control. Only biometrics can require a notified body.** |
| **47** | **EU Declaration of Conformity** | Draw up a **written, machine-readable, physical or electronically signed** EU DoC **for each high-risk AI system** and keep it available to national competent authorities **for 10 years** after placing on market/putting into service. It must **identify the system**; a copy goes to authorities **on request** (¶1). It must **state that the system meets the Section 2 requirements**, contain the information in **Annex V**, and be **translated into a language easily understood by the national competent authorities** of each Member State where the system is placed on the market or made available (¶2). Where other Union harmonisation legislation also requires a DoC, **a single DoC** covers all applicable Union law (¶3). **By drawing it up, the provider assumes responsibility for compliance**, and must keep it up to date (¶4). |
| **48** | **CE Marking** | Subject to the general principles in **Art 30 of Regulation (EC) No 765/2008** (¶1). **¶2 — for high-risk AI systems provided digitally, a digital CE marking shall be used, only if it can easily be accessed via the interface from which the system is accessed, or via an easily accessible machine-readable code or other electronic means.** ¶3: affixed **visibly, legibly and indelibly**; where not possible or not warranted by the nature of the system, affixed to **packaging or accompanying documentation**. ¶4: where a notified body was involved, the CE marking is **followed by the notified body's identification number**, affixed by the body or under its instructions, and the number must also appear in **any promotional material** claiming CE conformity. ¶5: where other Union law also provides for CE marking, the marking indicates compliance with that law too. |
| **49** | **Registration** | **¶1** Before placing on market/putting into service an **Annex III** high-risk system — **except Annex III point 2 (critical infrastructure)** — the **provider or authorised representative must register themselves AND the system** in the **EU database (Art 71)**. **¶2** Before placing on market/putting into service a system the provider has concluded is **NOT high-risk under Art 6(3)**, the provider or authorised representative **must still register themselves and that system** in the EU database. **¶3** Before putting into service or using an Annex III high-risk system (except point 2), **deployers that are public authorities, EU institutions/bodies/offices/agencies, or persons acting on their behalf**, must **register themselves, select the system and register its use**. **¶4** For **Annex III points 1, 6 and 7** (biometrics, law enforcement, migration/asylum/border), registration goes into a **secure non-public section** of the database, limited to specified Annex VIII/IX data points, accessible only to the Commission and Art 74(8) national authorities. **¶5** **Annex III point 2 systems are registered at national level**, not in the EU database. |
| **72** | **Post-Market Monitoring by Providers and Post-Market Monitoring Plan for High-Risk AI Systems** | **Establish and document a post-market monitoring system proportionate to the nature of the AI technologies and the risks** (¶1). It must **actively and systematically collect, document and analyse relevant data** — from deployers or other sources — **on performance throughout the systems' lifetime**, allowing evaluation of **continuous compliance** with Section 2; where relevant it must include **analysis of interaction with other AI systems**. It does **not** cover sensitive operational data of law-enforcement deployers (¶2). **¶3:** the system must be **based on a post-market monitoring plan**, and **that plan is part of the Annex IV technical documentation**. `[AMENDED]` The Commission, taking utmost account of the Board's opinion, shall adopt **guidance including a template by 2 September 2027** *(previously: an implementing act by 2 February 2026)*. **¶4:** where a PMM system/plan already exists under Annex I Section A legislation, providers **may integrate** the AI Act elements into it, provided an equivalent level of protection is achieved — also available to **financial institutions** for Annex III point 5 systems. |
| **73** | **Reporting of Serious Incidents** | **Providers of high-risk systems placed on the Union market must report any serious incident to the market surveillance authorities of the Member State where the incident occurred** (¶1). **THE DEADLINES:** **¶2 — default: immediately after establishing a causal link (or reasonable likelihood of one) between the AI system and the incident, and IN ANY EVENT NOT LATER THAN 15 DAYS after the provider (or where applicable the deployer) becomes aware** of it; the period must take account of the **severity** of the incident. **¶3 — widespread infringement or a serious incident as defined in Art 3(49)(b): immediately, and NOT LATER THAN 2 DAYS after becoming aware.** **¶4 — death of a person: immediately after establishing, or as soon as it suspects, a causal relationship, but NOT LATER THAN 10 DAYS after the date of becoming aware.** **¶5:** an **incomplete initial report** may be submitted first, followed by a complete report. **¶6:** after reporting, the provider must **without delay perform necessary investigations**, including a **risk assessment of the incident and corrective action**, cooperate with competent authorities and the notified body, and **must not alter the AI system in a way that may affect subsequent evaluation of causes before informing the authorities**. **¶8:** the market surveillance authority must take Art 19 Reg (EU) 2019/1020 measures **within 7 days** of notification. ¶9/¶10: reporting narrowed to Art 3(49)(c) incidents for providers under equivalent Union reporting regimes and for MDR/IVDR devices. ¶11: national authorities notify the Commission immediately. **→ Summary of deadlines: 2 days (widespread infringement / Art 3(49)(b)) · 10 days (death) · 15 days (default). Authority must act within 7 days.** |

Sources: https://artificialintelligenceact.eu/article/{8,9,10,11,12,13,14,15,16,17,18,19,20,21,26,27,43,47,48,49,72,73}/

---

## 4. ANNEX IV — TECHNICAL DOCUMENTATION (COMPLETE STRUCTURE)

**Official heading:** *Annex IV: Technical Documentation Referred to in Article 11(1)*

**Chapeau:** "The technical documentation referred to in Article 11(1) shall contain **at least** the following information, **as applicable to the relevant AI system**:"

Two structural notes for your generator: (1) **"at least"** = this is a floor, not a ceiling; (2) **"as applicable"** = per-item applicability logic is legitimate, and several sub-points are themselves internally qualified ("where applicable", "where relevant", "where the AI system is a component of products"). **Annex IV appears unchanged by the Digital Omnibus.**

---

**1. A general description of the AI system including:**

- **(a)** its **intended purpose**, the **name of the provider** and the **version of the system reflecting its relation to previous versions**;
- **(b)** how the AI system **interacts with, or can be used to interact with, hardware or software, including with other AI systems, that are not part of the AI system itself**, where applicable;
- **(c)** the **versions of relevant software or firmware**, and any **requirements related to version updates**;
- **(d)** the description of **all the forms in which the AI system is placed on the market or put into service**, such as **software packages embedded into hardware, downloads, or APIs**;
- **(e)** the description of the **hardware on which the AI system is intended to run**;
- **(f)** where the AI system is a component of products, **photographs or illustrations showing external features, the marking and internal layout of those products**;
- **(g)** a **basic description of the user-interface provided to the deployer**;
- **(h)** **instructions for use** for the deployer, and a basic description of the user-interface provided to the deployer, where applicable.

**2. A detailed description of the elements of the AI system and of the process for its development, including:**

- **(a)** the **methods and steps performed for the development** of the AI system, including, where relevant, **recourse to pre-trained systems or tools provided by third parties and how those were used, integrated or modified by the provider**;
- **(b)** the **design specifications** of the system, namely: the **general logic of the AI system and of the algorithms**; the **key design choices including the rationale and assumptions made**, including with regard to persons or groups of persons in respect of whom the system is intended to be used; the **main classification choices**; **what the system is designed to optimise for, and the relevance of the different parameters**; the description of the **expected output and output quality**; the **decisions about any possible trade-off** made regarding the technical solutions adopted to comply with the requirements in Chapter III, Section 2;
- **(c)** the description of the **system architecture** explaining **how software components build on or feed into each other and integrate into the overall processing**; the **computational resources used to develop, train, test and validate** the AI system;
- **(d)** where relevant, the **data requirements in terms of datasheets** describing the **training methodologies and techniques and the training data sets used**, including: a **general description of these data sets**; information about their **provenance, scope and main characteristics**; **how the data was obtained and selected**; **labelling procedures** (e.g. for supervised learning); **data cleaning methodologies** (e.g. outliers detection);
- **(e)** **assessment of the human oversight measures needed in accordance with Article 14**, including an assessment of the **technical measures needed to facilitate the interpretation of the outputs of AI systems by the deployers, in accordance with Article 13(3), point (d)**;
- **(f)** where applicable, a detailed description of **pre-determined changes to the AI system and its performance**, together with all relevant information related to the **technical solutions adopted to ensure continuous compliance** with the Chapter III, Section 2 requirements;
- **(g)** the **validation and testing procedures used**, including information about the **validation and testing data used and their main characteristics**; **metrics used to measure accuracy, robustness and compliance** with other relevant Chapter III Section 2 requirements, **as well as potentially discriminatory impacts**; **test logs and all test reports dated and signed by the responsible persons**, including with regard to pre-determined changes as referred to under point (f);
- **(h)** **cybersecurity measures put in place.**

**3. Detailed information about the monitoring, functioning and control of the AI system, in particular with regard to:**
- its **capabilities and limitations in performance**, including the **degrees of accuracy for specific persons or groups of persons** on which the system is intended to be used and the **overall expected level of accuracy in relation to its intended purpose**;
- the **foreseeable unintended outcomes and sources of risks to health and safety, fundamental rights and discrimination** in view of the intended purpose;
- the **human oversight measures needed in accordance with Article 14**, including the **technical measures put in place to facilitate the interpretation of the outputs** by deployers;
- **specifications on input data**, as appropriate.

*(Note: point 3 is a single continuous paragraph in the official text, not a lettered list. I have bulleted its four clauses for readability — your generator should probably render it as one section with four sub-headings.)*

**4.** A description of the **appropriateness of the performance metrics** for the specific AI system.

**5.** A **detailed description of the risk management system in accordance with Article 9**.

**6.** A description of **relevant changes made by the provider to the system through its lifecycle**.

**7.** A **list of the harmonised standards applied in full or in part**, the references of which have been **published in the Official Journal of the European Union**; **where no such harmonised standards have been applied, a detailed description of the solutions adopted to meet the requirements set out in Chapter III, Section 2**, including a **list of other relevant standards and technical specifications applied**.

**8.** A **copy of the EU declaration of conformity referred to in Article 47**.

**9.** A **detailed description of the system in place to evaluate the AI system performance in the post-market phase in accordance with Article 72**, including the **post-market monitoring plan referred to in Article 72(3)**.

Source: https://artificialintelligenceact.eu/annex/4/

**Generator design notes:**
- Points **1–3** carry essentially all the sub-structure (1 has (a)–(h); 2 has (a)–(h); 3 is prose). Points **4–9 are single-sentence sections** — short headings, no sub-points.
- Point **7 is a conditional branch**: either "list of harmonised standards applied" OR "detailed description of solutions adopted + list of other standards". Since **no AI Act harmonised standards are yet cited in the OJ (see §9), in practice EVERY Annex IV document written today must take the second branch.** This is a strong, defensible default for your tool.
- Point **8 creates a circular dependency** with Art 47 (the DoC references the technical documentation, and the technical documentation embeds the DoC). Handle as an appendix/attachment.
- Point **9 embeds the Art 72(3) post-market monitoring plan** as a required component — and the Commission template for it is now not due until **2 September 2027**, so you must generate it free-form for now.
- Art 11(1) allows **SMEs, start-ups and SMCs** to use a **Commission simplified form**, which notified bodies must accept. 🚩 I found no evidence that this simplified form has been published yet — worth a runtime check.

---

## 5. GPAI OBLIGATIONS

### 5.1 Art 51 — Classification as GPAI with systemic risk
A GPAI model is classified as having **systemic risk** if **either**:
- **(a)** it has **high impact capabilities** evaluated on the basis of appropriate technical tools and methodologies, including indicators and benchmarks; **or**
- **(b)** by **Commission decision** (ex officio or following a **qualified alert from the scientific panel**), it has capabilities or impact equivalent to (a), having regard to the **Annex XIII** criteria.

**¶2 — the threshold:** "A general-purpose AI model shall be **presumed** to have high impact capabilities pursuant to paragraph 1, point (a), when **the cumulative amount of computation used for its training measured in floating point operations is greater than 10²⁵**."

**¶3:** the Commission may amend the thresholds and supplement benchmarks/indicators by **delegated act** in light of algorithmic improvements or increased hardware efficiency. 🚩 **I did not find evidence of such a delegated act having been adopted — verify at runtime, as this number is the most likely single value to change.**

Note it is a **rebuttable presumption**, not a bright-line rule, and (b) provides a route to designation **below** 10²⁵.
Source: https://artificialintelligenceact.eu/article/51/

### 5.2 Art 53 — Obligations for all GPAI providers
**¶1:**
- **(a)** Draw up and keep up to date the **technical documentation of the model**, including its **training and testing process and the results of its evaluation**, containing at minimum the **Annex XI** information, **for provision on request to the AI Office and national competent authorities**.
- **(b)** Draw up, keep up to date and **make available information and documentation to downstream providers** who intend to integrate the model into their AI systems. Without prejudice to IP rights, confidential business information and trade secrets, this must **(i)** enable downstream providers to have a **good understanding of the capabilities and limitations** of the model and to comply with their own obligations, and **(ii)** contain at minimum the **Annex XII** elements.
- **(c)** **Copyright policy** — "put in place a **policy to comply with Union law on copyright and related rights**, and in particular to **identify and comply with, including through state-of-the-art technologies, a reservation of rights expressed pursuant to Article 4(3) of Directive (EU) 2019/790**." (i.e. honour machine-readable TDM opt-outs.)
- **(d)** **Training-data summary** — "draw up and **make publicly available a sufficiently detailed summary about the content used for training** of the general-purpose AI model, **according to a template provided by the AI Office**."

**¶2 — Open-source exemption:** (a) and (b) **do not apply** to models released under a **free and open-source licence** allowing access, usage, modification and distribution, **and whose parameters including weights, model architecture information, and model usage information are made publicly available**. **This exemption does NOT apply to models with systemic risk.** — **Note carefully: (c) copyright policy and (d) training-data summary apply to open-source models too.**

**¶4:** Providers may rely on **codes of practice** (Art 56) to demonstrate compliance **until a harmonised standard is published**; compliance with European harmonised standards **grants presumption of conformity** to the extent covered. Providers who adhere to neither **must demonstrate alternative adequate means of compliance for Commission assessment**.

**¶5–6:** Commission may adopt delegated acts detailing measurement/calculation methodologies for Annex XI points 2(d)–(e), and to amend Annexes XI and XII.
Source: https://artificialintelligenceact.eu/article/53/

### 5.3 Art 54 — Authorised representatives of GPAI providers
Providers **established in third countries** must, **by written mandate and prior to placing the model on the Union market**, appoint an **authorised representative established in the Union**. The mandate must empower the representative to: **(a)** verify the Annex XI technical documentation has been drawn up and all Art 53 (and where applicable Art 55) obligations fulfilled; **(b)** keep a copy of the Annex XI documentation at the disposal of the AI Office and national competent authorities **for 10 years after placing on the market**, plus the provider's contact details; **(c)** provide the AI Office on reasoned request with all information and documentation necessary to demonstrate compliance; **(d)** cooperate with the AI Office and competent authorities, **including where the model is integrated into AI systems** placed on the market in the Union. The representative may be addressed **in addition to or instead of** the provider (¶4), and **must terminate the mandate** if it considers the provider is acting contrary to its obligations, immediately informing the AI Office with reasons (¶5). **Same open-source exemption** as Art 53(2), again **not applicable to systemic-risk models** (¶6).
Source: https://artificialintelligenceact.eu/article/54/

### 5.4 Art 55 — Additional obligations for GPAI with systemic risk
**In addition to Arts 53 and 54:**
- **(a)** Perform **model evaluation in accordance with standardised protocols and tools reflecting the state of the art**, including **conducting and documenting adversarial testing** with a view to identifying and mitigating systemic risks;
- **(b)** **Assess and mitigate possible systemic risks at Union level**, including their sources, that may stem from development, placing on the market, or use;
- **(c)** **Keep track of, document, and report, without undue delay, to the AI Office and as appropriate to national competent authorities, relevant information about serious incidents and possible corrective measures**;
- **(d)** Ensure an **adequate level of cybersecurity protection for the model and the physical infrastructure of the model**.

**¶2:** same code-of-practice / harmonised-standard presumption mechanism as Art 53(4).
Source: https://artificialintelligenceact.eu/article/55/

### 5.5 Annex XI — Technical documentation for GPAI providers

**Section 1 — for ALL GPAI providers** ("as appropriate to the size and risk profile of the model"):
1. **General description of the model** including: **(a)** the **tasks the model is intended to perform** and the **type and nature of AI systems in which it can be integrated**; **(b)** the **acceptable use policies** applicable; **(c)** the **date of release and methods of distribution**; **(d)** the **architecture and number of parameters**; **(e)** the **modality (e.g. text, image) and format of inputs and outputs**; **(f)** the **licence**.
2. **Detailed description of the elements of the model and relevant information on the development process**, including: **(a)** the **technical means** (e.g. instructions of use, infrastructure, tools) required for integration into AI systems; **(b)** the **design specifications of the model and training process**, including training methodologies and techniques, key design choices including rationale and assumptions, what the model is designed to optimise for and the relevance of different parameters; **(c)** **information on the data used for training, testing and validation**, including **type and provenance of data and curation methodologies** (e.g. cleaning, filtering), the **number of data points, their scope and main characteristics**, how the data was obtained and selected, and **all other measures to detect the unsuitability of data sources and methods to detect identifiable biases**; **(d)** the **computational resources used to train the model (e.g. number of floating point operations), training time**, and other relevant training details; **(e)** **known or estimated energy consumption** of the model — where unknown, may be based on information about computational resources used.

**Section 2 — ADDITIONAL, for GPAI with systemic risk:**
1. **Detailed description of the evaluation strategies, including evaluation results**, on the basis of available public evaluation protocols and tools or other methodologies. Evaluation strategies **shall include evaluation criteria, metrics and the methodology on the identification of limitations**.
2. Where applicable, **detailed description of measures for internal and/or external adversarial testing (e.g. red teaming), model adaptations including alignment and fine-tuning**.
3. Where applicable, **detailed description of the system architecture** explaining how software components build or feed into each other and integrate into the overall processing.

Source: https://artificialintelligenceact.eu/annex/11/

### 5.6 Annex XII — Transparency information to downstream providers
1. **General description of the model** including: **(a)** tasks intended and type/nature of AI systems it can be integrated into; **(b)** acceptable use policies; **(c)** date of release and methods of distribution; **(d)** **how the model interacts, or can be used to interact, with hardware or software not part of the model itself**, where applicable; **(e)** **versions of relevant software** related to use of the model, where applicable; **(f)** **architecture and number of parameters**; **(g)** **modality and format of inputs and outputs**; **(h)** **the licence for the model**.
2. **Description of the elements of the model and of the process for its development**, including: **(a)** the **technical means** (e.g. instructions for use, infrastructure, tools) required for integration into AI systems; **(b)** the **modality and format of inputs and outputs and their maximum size (e.g. context window length)**; **(c)** **information on the data used for training, testing and validation**, where applicable, including **type and provenance of data and curation methodologies**.

Source: https://artificialintelligenceact.eu/annex/12/

**Note the asymmetry — useful for your tool:** Annex XI (to regulators) demands FLOPs, energy consumption, number of data points, bias-detection measures. Annex XII (to downstream integrators) drops all of those but **adds context window length and the licence**. If you're building on a third-party model, **Annex XII is the artefact you should be demanding from your model supplier** — it is exactly the information you need to write your own Annex IV point 2(a) ("recourse to pre-trained systems or tools provided by third parties").

### 5.7 GPAI Code of Practice — status
- **Published by the European Commission on 10 July 2025**, covering Arts 53 and 55, structured in chapters on **Transparency, Copyright, and Safety & Security** (the last applying only to systemic-risk models).
- GPAI obligations entered into application **2 August 2025**.
- Signatories include **Google, OpenAI, Microsoft, Anthropic and Mistral**. **Meta declined to sign.**
- A **Signatory Taskforce**, chaired by the AI Office, held its **first constitutive meeting on 30 January 2026**.
- **Commission enforcement powers over GPAI (Art 101) activated 2 August 2026.**
- Legal effect: adherence is **voluntary** but provides a presumption-like route to demonstrating compliance under Arts 53(4)/55(2) **until harmonised standards are published**; non-adherents must "demonstrate alternative adequate means of compliance for assessment by the Commission."
- Sources: https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai | https://digital-strategy.ec.europa.eu/en/policies/signatory-taskforce-gpai-code-practice | https://digital-strategy.ec.europa.eu/en/news/first-meeting-signatory-taskforce-general-purpose-ai-code-practice | https://artificialintelligenceact.eu/introduction-to-code-of-practice/

---

## 6. PENALTIES

### 6.1 Art 99 — Penalties (applies from 2 August 2025)

| Tier | Trigger | Maximum fine |
|---|---|---|
| **Art 99(3)** | Non-compliance with the **Art 5 prohibited practices** | **€35,000,000** or, if the offender is an undertaking, **7% of total worldwide annual turnover** for the preceding financial year — **whichever is HIGHER** |
| **Art 99(4)** | Non-compliance with listed operator/notified-body obligations **other than Art 5** | **€15,000,000** or **3% of total worldwide annual turnover** — **whichever is HIGHER** |
| **Art 99(5)** | **Supply of incorrect, incomplete or misleading information** to notified bodies or national competent authorities in reply to a request | **€7,500,000** or **1% of total worldwide annual turnover** — **whichever is HIGHER** |

**Art 99(4) covers specifically:**
- (a) obligations of **providers** — **Art 16**
- (b) obligations of **authorised representatives** — Art 22
- (c) obligations of **importers** — Art 23
- (d) obligations of **distributors** — Art 24
- **(da)** `[NEW — Omnibus]` obligations of **providers and operators pursuant to Art 25(2) and (4)** (value-chain cooperation)
- (e) obligations of **deployers** — **Art 26**
- (f) requirements and obligations of **notified bodies** — Art 31, Art 33(1),(3),(4), Art 34
- **(g) transparency obligations for providers and deployers — Art 50**

**→ Note the gap: Art 99(4) references Art 16, not Arts 8–15 or 17–21 individually. The substantive requirements are enforced *through* Art 16(a) ("ensure that their high-risk AI systems are compliant with the requirements set out in Section 2"), which incorporates Arts 8–15 by reference. Your tool should not present Arts 9–15 as separately fineable.**

**SME / SMC proportionality:**
- **Art 99(6):** "In the case of **SMEs, including start-ups**, each fine referred to in this Article shall be up to the **percentages or amount referred to in paragraphs 3, 4 and 5, whichever thereof is LOWER**." — **the inverse of the general rule.** So an Art 5 breach by a start-up is capped at the *lower* of €35m or 7% of turnover, which for a small company means the percentage figure, often a trivially small number.
- **Art 99(6a)** `[NEW — Omnibus]`: "In the case of **SMCs**, each fine referred to in **paragraphs 4 and 5** shall be up to the percentages or amount referred therein, **whichever is LOWER**." — **Note SMCs get the lower-of rule only for ¶4 and ¶5, NOT for ¶3 (prohibited practices).** SMCs face the full higher-of exposure for Art 5 breaches.
- **Art 99(1)** `[AMENDED]`: Member States "shall take into account the interests of SMEs, including start-ups, **and SMCs**, and their economic viability when imposing penalties."

🚩 **"SMC" = small mid-cap company, a category introduced across the EU simplification/omnibus packages. I did not verify the precise defining instrument or headcount/turnover thresholds — flag this for your own check.**

**Art 99(7) — aggravating/mitigating factors (10 listed, (a)–(j)):** nature, gravity and duration of the infringement and its consequences (incl. number of affected persons and level of damage); whether other market surveillance authorities already fined the same operator for the same infringement; whether other authorities fined for infringements of other law arising from the same act or omission; **size, annual turnover and market share**; financial benefits gained or losses avoided; **degree of cooperation with authorities**; **degree of responsibility taking into account technical and organisational measures implemented**; **how the infringement became known, in particular whether and to what extent the operator notified it**; **intentional or negligent character**; action taken to mitigate harm.

**Art 99(8)–(11):** Member States set rules on fining public authorities; fines may be imposed by courts or other bodies; procedural safeguards and effective judicial remedies apply; annual reporting to the Commission.

Source: https://artificialintelligenceact.eu/article/99/

### 6.2 Art 101 — Fines for providers of GPAI models
- **Imposed by the COMMISSION** (not Member States) — this is a centrally enforced regime, mirroring competition-law practice.
- **Maximum: 3% of annual total worldwide turnover in the preceding financial year, or €15,000,000, whichever is HIGHER.**
- **Requires intent or negligence.** Triggers: **(a)** infringing relevant provisions of the Regulation; **(b)** failing to comply with an **Art 91** document/information request, or supplying incorrect, incomplete or misleading information; **(c)** failing to comply with a measure requested under **Art 93**; **(d)** failing to give the Commission **access to the model for an Art 92 evaluation**.
- In fixing the amount: regard to **nature, gravity and duration**, with due account of **proportionality and appropriateness**, and account taken of **commitments made under Art 93(3) or in codes of practice under Art 56**. (→ A concrete incentive to sign the GPAI Code of Practice.)
- **¶2:** right to be heard — the Commission must communicate preliminary findings first.
- **¶5:** the **CJEU has unlimited jurisdiction** to cancel, reduce **or increase** the fine.
- **Applied from 2 August 2025** per Art 113(b), but Art 113(b) **expressly excepts Art 101** from the 2 Aug 2025 date — so Art 101 falls under the **general 2 August 2026** date. **This is why commentators describe Commission GPAI enforcement powers as "fully activating" on 2 August 2026.**

Source: https://artificialintelligenceact.eu/article/101/

---

## 7. ART 4 AI LITERACY AND ART 50 TRANSPARENCY

### 7.1 Art 4 — AI literacy (in force since 2 February 2025; amended by Omnibus)

**Current text (¶1)** `[AMENDED]`:
> "Providers and deployers of AI systems shall take measures to **support the development of AI literacy** of their staff and other persons dealing with the operation and use of AI systems on their behalf, taking into account their **technical knowledge, experience, education and training** and the **context the AI systems are to be used in**, and considering the **persons or groups of persons on whom the AI systems are to be used**. **This obligation does not require providers or deployers to guarantee any specific level of AI literacy of any individual.**"

*(Pre-Omnibus text was: "shall take measures to ensure, to their best extent, a sufficient level of AI literacy...")*

- **¶2** `[NEW]`: Commission and Member States shall support providers and deployers, **in particular SMEs**; the Commission shall **publish practical examples of compliance** on the single information platform (Art 62(3)(b)).
- **¶3** `[NEW]`: the **AI Board shall adopt recommendations**, taking into account **European competence frameworks**, including by **setting out common objectives**.

**Scope note that matters a lot for your tool:** Art 4 sits in **Chapter I** and is **not limited to high-risk systems**. It binds providers and deployers of **any** AI system. It is the **one AI Act obligation that applies to essentially every company using AI in the EU today**, including minimal-risk users. It is also **not directly listed in Art 99(4)**, so its enforceability via administrative fine is indirect — but it is a live legal obligation and a discovery/evidence issue.

Source: https://artificialintelligenceact.eu/article/4/

### 7.2 Art 50 — Transparency (in force since 2 August 2026; NOT delayed)

**Four distinct obligations, each binding a different actor:**

| ¶ | Binds | Obligation | Exceptions |
|---|---|---|---|
| **50(1)** | **PROVIDERS** | Ensure AI systems **intended to interact directly with natural persons** are designed and developed so that **the natural persons concerned are informed that they are interacting with an AI system**. | Not required where this is **"obvious from the point of view of a natural person who is reasonably well-informed, observant and circumspect,"** taking into account the circumstances and context of use. Also disapplied for systems **authorised by law to detect, prevent, investigate or prosecute criminal offences**, subject to safeguards — **unless the system is available for the public to report a criminal offence**. |
| **50(2)** | **PROVIDERS** | **Machine-readable marking.** Providers of AI systems, **including general-purpose AI systems, generating synthetic audio, image, video or text content**, shall ensure the **outputs are marked in a machine-readable format and detectable as artificially generated or manipulated**. Technical solutions must be **"effective, interoperable, robust and reliable as far as this is technically feasible,"** taking into account specificities and limitations of content types, costs of implementation, and the generally acknowledged state of the art **as may be reflected in relevant technical standards**. | Not applicable to the extent the systems **perform an assistive function for standard editing** or **do not substantially alter the input data provided by the deployer or the semantics thereof**; or where **authorised by law** for criminal-offence purposes. |
| **50(3)** | **DEPLOYERS** | **Notification for emotion recognition / biometric categorisation.** Deployers of an **emotion recognition system** or a **biometric categorisation system** shall **inform the natural persons exposed thereto of the operation of the system**, and shall process personal data in accordance with **GDPR / Reg (EU) 2018/1725 / Dir (EU) 2016/680**. | Not applicable where the systems are **permitted by law to detect, prevent or investigate criminal offences**, subject to safeguards. *(Also note the biometric categorisation definition itself excludes systems "ancillary to another commercial service and strictly necessary for objective technical reasons.")* |
| **50(4)** | **DEPLOYERS** | **Deepfake + public-interest text labelling.** ¶4 first subpara: deployers of a system that **generates or manipulates image, audio or video content constituting a deep fake** shall **disclose that the content has been artificially generated or manipulated**. ¶4 second subpara: deployers of a system that **generates or manipulates TEXT which is published with the purpose of informing the public on matters of public interest** shall disclose that the text has been artificially generated or manipulated. | **Deepfakes:** not applicable where authorised by law for criminal-offence purposes. Where the content forms part of an **evidently artistic, creative, satirical, fictional or analogous work or programme**, the obligation is **limited to disclosure of the existence of such content in an appropriate manner that does not hamper the display or enjoyment of the work**. **Text:** not applicable where authorised by law for criminal-offence purposes, **or where the AI-generated content has undergone a process of human review or editorial control and a natural or legal person holds editorial responsibility for the publication**. |

**50(5) — the "how":** "The information referred to in paragraphs 1 to 4 shall be provided to the natural persons concerned **in a clear and distinguishable manner at the latest at the time of the first interaction or exposure**. The information shall **conform to the applicable accessibility requirements**."

**50(6):** ¶1–4 do not affect Chapter III requirements and are without prejudice to other transparency obligations in Union or national law.

**50(7)** `[AMENDED]`: **The Commission** (previously: the AI Office) shall encourage and facilitate codes of practice at Union level for **detection, marking and labelling** of artificially generated or manipulated content. **Taking utmost account of the Board's opinion**, the Commission shall assess whether adherence is adequate to ensure compliance with **¶2 and ¶4**, per Art 56(6). If inadequate, the Commission **may adopt an implementing act specifying common rules** (Art 98(2) examination procedure).

**Grandfathering (Art 111(4)** `[NEW]`**):** providers of generative systems **already on the market before 2 August 2026** have until **2 December 2026** to comply with **Art 50(2)**. **That deadline is ~2.5 months away as of today.**

**Penalty exposure:** Art 50 breaches fall under **Art 99(4)(g)** → **€15m / 3% of worldwide turnover, whichever is higher**.

Source: https://artificialintelligenceact.eu/article/50/ | https://artificialintelligenceact.eu/article/111/

### 7.3 Concrete answer: what must a chatbot / generative AI startup do TODAY?
1. **Art 50(1)** — if you *provide* the chatbot (i.e. you put it on the market under your own name — see §8, this is almost certainly you), disclose that the user is interacting with an AI system, **in a clear and distinguishable manner, at the latest at first interaction**, unless obvious.
2. **Art 50(2)** — if your system generates **synthetic audio, image, video or text**, mark the outputs in a **machine-readable format** detectable as artificially generated. This means embedded provenance metadata / watermarking (C2PA-style), **not** a visible "AI-generated" badge. **The assistive-editing / no-substantial-alteration carve-out is narrow.** Deadline for pre-2 Aug 2026 systems: **2 December 2026**.
3. **Art 50(4)** — if you *deploy* to generate deepfakes or to publish AI text on matters of public interest, disclose. Human editorial review with named editorial responsibility exempts the text limb.
4. **Art 50(3)** — if you deploy emotion recognition or biometric categorisation, notify exposed persons (and check Art 5(1)(f)/(g) first — workplace/education emotion inference and sensitive-attribute categorisation are **prohibited outright**).
5. **Art 4** — take measures to support AI literacy of staff and persons operating the system on your behalf.
6. **Art 5(1)(ba)/(bb)** — from **2 December 2026**, ensure your generative system either doesn't make NCII/CSAM its intended purpose, or has "reasonable and adequate technical safety measures and other safeguards to reliably prevent" such generation where it would otherwise be a "reasonably foreseeable and reproducible outcome, without requiring significant technical modification." **For a general-purpose image or video generator, this is a concrete engineering requirement with a hard date.**

---

## 8. PROVIDER vs DEPLOYER, AND ART 25

### 8.1 The definitions (Art 3)

> **Art 3(3) 'provider'** means "a natural or legal person, public authority, agency or other body that **develops** an AI system or a general-purpose AI model **or that has an AI system or a general-purpose AI model developed** and **places it on the market or puts the AI system into service under its own name or trademark**, whether for payment or free of charge."

> **Art 3(4) 'deployer'** means "a natural or legal person, public authority, agency or other body **using an AI system under its authority** except where the AI system is used in the course of a **personal non-professional activity**."

**Supporting definitions:**
- **'placing on the market'** = the **first making available** of an AI system or GPAI model on the Union market.
- **'making available on the market'** = supply for distribution or use on the Union market **in the course of a commercial activity, whether in return for payment or free of charge**.
- **'putting into service'** = supply of an AI system **for first use directly to the deployer or for own use** in the Union for its intended purpose.
- **'substantial modification'** = "a change to an AI system **after its placing on the market or putting into service** which is **not foreseen or planned in the initial conformity assessment** carried out by the provider and **as a result of which the compliance of the AI system with the requirements set out in Chapter III, Section 2 is affected** **or** results in a **modification to the intended purpose** for which the AI system has been assessed."

Source: https://artificialintelligenceact.eu/article/3/

### 8.2 ⚠️ The startup trap — why API wrappers are PROVIDERS

**This is the most commercially important point in the brief, and the analysis is cleaner than most people assume.**

The Art 3(3) definition has **two limbs joined by "or"**: you are a provider if you **develop** an AI system, **or** if you **have one developed** — and in either case you place it on the market or put it into service **under your own name or trademark**.

A startup that builds a product on the OpenAI or Anthropic API:
- **Develops an AI system.** Their product — prompts, orchestration, retrieval, tool-calling, business logic, UI, plus the underlying model — is itself "a machine-based system that... infers, from the input it receives, how to generate outputs such as predictions, content, recommendations, or decisions" (Art 3(1)). The fact that the inference engine is someone else's model does not make the composite system not an AI system.
- **Places it on the market under its own name or trademark.** They ship it as "AcmeBot," not as "OpenAI."

**⇒ They are the PROVIDER of their AI system.** OpenAI/Anthropic remain the provider of the **GPAI model** (Art 53 duties) and, if they ship a general-purpose AI *system* like a consumer chat product, the provider of that system too. **These are different objects, and both sets of duties exist simultaneously.** The startup is *also* typically a **deployer** of the upstream model, and often a deployer of its own system when it uses it internally.

**Corollaries the tool should surface:**
- "We just call an API" is **not** a defence. It does not make you a deployer-only.
- **Art 50(1) and 50(2) bind PROVIDERS.** The startup owes the chatbot disclosure and the machine-readable marking duty **in its own right** — it cannot rely on the model provider having done it, and must verify that the marking survives its own pipeline.
- If the startup's system falls in Annex III (e.g. a CV-screening tool → Annex III 4(a); a credit-scoring feature → 5(b); an ed-tech grading tool → 3(b)), **the startup carries the full Art 16 provider stack** — QMS, technical documentation, conformity assessment, CE marking, EU database registration — from **2 December 2027**.
- **Art 25(2)** is the startup's practical lever on its model supplier: see below.
- 🚩 *This provider/deployer characterisation is my legal analysis applying the Art 3 definitions, not a quoted statement from the Act or from Commission guidance. It is the mainstream reading and is supported by Art 25(1)(c)'s explicit reference to general-purpose AI systems, but flagging it as analysis rather than citation.*

### 8.3 Art 25 — Responsibilities Along the AI Value Chain

**Art 25(1) — the three conversion triggers.** "Any **distributor, importer, deployer or other third-party** shall be considered to be a **provider of a high-risk AI system** for the purposes of this Regulation and **shall be subject to the obligations of the provider under Article 16**, in any of the following circumstances:"

- **(a) OWN-BRANDING** — "they **put their name or trademark on a high-risk AI system already placed on the market or put into service**, without prejudice to contractual arrangements stipulating that the obligations are otherwise allocated";
- **(b) SUBSTANTIAL MODIFICATION** — "they make a **substantial modification** to a high-risk AI system that has already been placed on the market or put into service **in such a way that it remains a high-risk AI system pursuant to Article 6**";
- **(c) CHANGE OF INTENDED PURPOSE** — "they **modify the intended purpose of an AI system, including a general-purpose AI system, which has not been classified as high-risk** and has already been placed on the market or put into service **in such a way that the AI system concerned becomes a high-risk AI system in accordance with Article 6**."

**Point (c) is the API-wrapper provision.** It names **general-purpose AI systems explicitly**. Take a general-purpose chat model — not high-risk — and point it at CV screening, and **you** become the provider of a high-risk AI system with the full Art 16 stack. The upstream model provider does not.

**Art 25(2) — the handover, substantially expanded by the Omnibus.**
- "Where the circumstances referred to in paragraph 1 occur, **the provider that initially placed the AI system on the market or put it into service shall no longer be considered to be a provider of that specific AI system**."
- `[NEW]` "That initial provider shall **closely cooperate with new providers** and shall make available the **necessary information** and provide the **reasonably expected technical access and other assistance** required for fulfilment of the obligations, in particular regarding compliance with the conformity assessment of high-risk AI systems."
- `[NEW]` **The obligation shall include, where relevant:**
  - **(a)** making available **technical documentation sufficient to assess compliance with the requirements laid down in Article 16**;
  - **(b)** **informing the new providers about known limitations and failure modes**; and
  - **(c)** providing the new providers with **targeted technical access, including for testing and validation**.
- **The escape hatch:** "This paragraph shall **not apply in cases where the initial provider has clearly specified that its AI system is not to be changed into a high-risk AI system** and therefore does not fall under the obligation to cooperate with the new providers and hand over the documentation."

**→ Two things your tool should check in a repo:** (1) whether the upstream model's **terms of service or acceptable use policy contain a "not for high-risk use" specification** — because if they do, Art 25(2)'s cooperation duty is switched off and the downstream startup is on its own for Annex IV; (2) whether the project has actually **obtained the Annex XII information** from its model supplier, which is the raw material for Annex IV point 2(a).

**Enforcement:** `[NEW]` **Art 99(4)(da)** now makes breach of **Art 25(2) and (4)** separately fineable at the **€15m / 3%** tier.

*(Art 25(3) addresses third-party suppliers of tools/services/components; Art 25(4) requires the provider of a high-risk system and the third party supplying an AI system, tools, services, components or processes to specify by **written agreement** the necessary information, capabilities, technical access and other assistance — with the Commission to develop **voluntary model contractual terms**. 🚩 I did not read ¶¶3–5 in full.)*

Source: https://artificialintelligenceact.eu/article/25/

---

## 9. STANDARDS

### 9.1 The legal mechanism — Art 40
> **Art 40(1):** "High-risk AI systems **or general-purpose AI models** which are in conformity with **harmonised standards or parts thereof the references of which have been published in the Official Journal of the European Union** in accordance with **Regulation (EU) No 1025/2012** shall be **presumed to be in conformity** with the requirements set out in Section 2 of this Chapter or, as applicable, with the obligations set out in Chapter V, Sections 2 and 3, **to the extent that those standards cover those requirements or obligations**."

Three conditions, all necessary: the standard must be **harmonised** (developed under a Commission standardisation request), its reference must be **cited in the OJEU**, and the presumption extends only **as far as the standard actually covers the requirement**. The effect is to **shift the burden of proof onto authorities** to disprove conformity.

**Art 40(2)** obliges the Commission to issue standardisation requests covering **all** Section 2 requirements and, as applicable, Chapter V Sections 2–3 obligations, plus deliverables on **energy and resource efficiency** reporting. `[NEW subpara]` adds a request for deliverables facilitating **joint compliance and presumption of conformity** across the AI Act and Annex I legislation simultaneously.

Source: https://artificialintelligenceact.eu/article/40/

### 9.2 CEN-CENELEC JTC 21 — status as of Sept 2026
- **JTC 21** ("Artificial Intelligence") is the joint technical committee tasked by the Commission's **standardisation request of May 2023** with producing the AI Act harmonised standards family.
- Covers roughly **ten areas**, mapping to the Section 2 requirements: **risk management systems, governance and quality of datasets, transparency, human oversight, accuracy, robustness, cybersecurity, quality management systems, and conformity assessment**.
- **The work is behind schedule.** CEN-CENELEC adopted **acceleration measures in October 2025**, targeting availability of prioritised deliverables by **Q4 2026**. The Commission's own FAQ states first harmonised standards are "projected to arrive by 2026," after which the Commission begins its review to decide on OJEU citation.
- **OJEU citation is a separate, subsequent, discretionary Commission step.** 🚩 **I found no evidence that ANY AI Act harmonised standard reference has yet been published in the OJEU.** Verify at runtime, but **plan on the assumption that the presumption of conformity is currently unavailable.**
- The standards delay was one of the stated reasons for the Omnibus deferral — the Commission cited that "neither industry nor harmonized standards bodies would be ready in time."
- Sources: https://digital-strategy.ec.europa.eu/en/faqs/understanding-standardisation-ai-act | https://www.cencenelec.eu/areas-of-work/cen-cenelec-topics/artificial-intelligence/ | https://jtc21.eu/ | https://artificialintelligenceact.eu/standard-setting-overview/

### 9.3 ISO/IEC 42001, ISO/IEC 23894, NIST AI RMF — and what they do NOT do

**The headline point for your tool: NONE of these three confers presumption of conformity under the AI Act. Not now, not on their current terms.** Art 40(1) is explicit that only standards **cited in the OJEU** do so. The Commission has stated directly that **"ISO/IEC 42001:2023 helps to set up an AI management system"** but its **definitions do not align with AI Act requirements**, which is precisely why Europe is developing its own standards rather than simply adopting the ISO texts wholesale.

| Framework | What it is | Certifiable? | Relationship to the AI Act |
|---|---|---|---|
| **ISO/IEC 42001:2023** | AI **management system** standard (AIMS). Plan-Do-Check-Act structure, Annex A controls. Organisation-level governance — "how to govern AI." | **Yes** — accredited third-party certification available | Closest analogue to **Art 17 QMS**. Substantial but **incomplete** overlap: 42001 is organisational, Art 17 is product-and-organisation and demands specific items (e.g. 17(1)(e) technical specifications, 17(1)(i) Art 73 incident procedures) that 42001 does not prescribe. **Strong evidence of good faith and a solid scaffold; NOT a compliance substitute and NOT a presumption of conformity.** |
| **ISO/IEC 23894:2023** | **Guidance** on AI risk management, adapting ISO 31000 to the AI lifecycle. "How" to the 42001 "what." | **No** — guidance only, no certification | Maps most directly to **Art 9 risk management system**. Useful as methodology for the Art 9(2) identify→estimate→evaluate→mitigate loop and for Annex IV point 5. **No legal effect under the AI Act.** |
| **NIST AI RMF 1.0** (+ Generative AI Profile) | Voluntary US framework: **Govern, Map, Measure, Manage** functions. | **No** — voluntary, no certification | A **methodology** that can operate inside a 42001 management system. NIST publishes a **crosswalk** to ISO 42001. Relevant to Art 9 and Art 15. **US-origin, no EU legal status whatsoever.** |

**Practical mapping guidance for your tool's output:**
- **ISO 42001 → Art 17** (QMS), plus partial coverage of Arts 9, 10, 72.
- **ISO 23894 → Art 9** (risk management), Annex IV point 5.
- **NIST AI RMF → Arts 9 and 15**, and as a measurement discipline for Annex IV point 2(g).
- **The honest message to users: these get you maybe 50-70% of the organisational scaffolding and meaningfully reduce the marginal cost of AI Act compliance, but they close zero of the legal gap.** The AI Act's product-level requirements — Annex IV technical documentation, Art 43 conformity assessment, Art 47 declaration of conformity, Art 48 CE marking, Art 49 EU database registration — have **no counterpart at all** in any of the three.
- **Until the JTC 21 standards are cited in the OJEU, every high-risk provider is in the Art 43(1) second-subparagraph / Annex IV point 7 "no harmonised standards applied" posture**, and must write "a detailed description of the solutions adopted to meet the requirements set out in Chapter III, Section 2." **Make that your generator's default branch.**

Sources: https://digital-strategy.ec.europa.eu/en/faqs/understanding-standardisation-ai-act | https://www.iso.org/standard/42001 | https://cloudsecurityalliance.org/blog/2025/01/29/how-can-iso-iec-42001-nist-ai-rmf-help-comply-with-the-eu-ai-act | https://www.eccouncil.org/cybersecurity-exchange/responsible-ai-governance/eu-ai-act-nist-ai-rmf-and-iso-iec-42001-a-plain-english-comparison/

---

## 10. UNCERTAINTY REGISTER — verify before shipping

Ranked by how much damage a wrong assumption would do:

1. 🚩 **I could not read the OJ text of Regulation (EU) 2026/1744 directly** (EUR-Lex AWS WAF block). The formal title and the 8 July 2026 / 24 July 2026 / 27 July 2026 dates come from secondary sources, though they are mutually consistent and the Commission's own page confirms 27 July 2026 entry into force. **The substance of the amendments I verified independently against the clause-level annotated consolidated text.**
2. 🚩 **Article 10(5) and the new "Article 4a."** Art 10(1) as consolidated now cross-references **"Article 4a(1)"**, and Art 10(5) is marked "Not present after the amendment." The special-category-personal-data bias-detection derogation appears to have been relocated into a new Article 4a. **I could not retrieve Art 4a (404).** If your tool touches bias testing on protected attributes, resolve this first — it is the legal basis for processing special-category data for fairness testing.
3. 🚩 **Whether the final Art 6(5) classification guidelines have been adopted.** Draft published 19 May 2026, consultation closed 23 June 2026. The final version will contain the Commission's own worked examples of high-risk vs not-high-risk — directly usable as classification logic.
4. 🚩 **Whether any AI Act harmonised standard has been cited in the OJEU.** I found none, but this is a negative finding from search, not a check of the OJ C-series.
5. 🚩 **The precise definition and thresholds of "SMC" (small mid-cap company)**, now load-bearing in Arts 11(1), 17(2), 99(1) and 99(6a).
6. 🚩 **Whether the 10²⁵ FLOP threshold has been amended** by delegated act under Art 51(3).
7. 🚩 **Art 49 registration changes.** Law-firm summaries mention the Omnibus "reinstating simplified registration for certain non-high-risk systems," but the consolidated Art 49 text I retrieved carries **no amendment markers**. Either the change landed elsewhere (Art 71? Annex VIII?) or the summaries are imprecise. The Art 6(4) → Art 49(2) duty as stated above appears intact.
8. 🚩 **Art 25(3)–(5)** not read in full; **Art 57** sandbox deadline not read directly; **Annexes V, VI, VII, VIII** not retrieved (relevant if you generate the DoC or model the conformity-assessment procedures).
9. 🚩 **Whether the Commission has published the Art 11(1) simplified technical documentation form** for SMEs/start-ups/SMCs, and the **Art 53(1)(d) training-data summary template** (the latter was published by the AI Office in July 2025, but I did not re-verify its current version).
10. The **provider/deployer characterisation of API-wrapper startups in §8.2** is my legal analysis applying Art 3, not a quoted authority.

---

## 11. RECOMMENDED SCANNER LOGIC (synthesis)

A defensible decision order for a repo scanner, given everything above:

1. **Art 5 gate (live now; (ba)/(bb) from 2 Dec 2026).** Any hit = stop, hard block. 7% / €35m. Check specifically for: emotion inference in workplace/HR or ed-tech contexts (5(1)(f)); biometric categorisation inferring sensitive attributes (5(1)(g)); face-image scraping pipelines (5(1)(e)); social-scoring-shaped feature engineering (5(1)(c)); and, for image/video generators, NCII/CSAM safeguards (5(1)(ba)/(bb) + 5(1a)(a)(ii)).
2. **Art 4 (live now).** Applies to everyone, every tier. Cheap to satisfy, and its absence is bad evidence.
3. **Art 50 (live now; 50(2) grandfather expires 2 Dec 2026).** Does the code path produce synthetic audio/image/video/text? → provider marking duty. Does it interact directly with natural persons? → disclosure duty. **This is the highest-yield check for the typical startup repo and the only high-value one with an imminent deadline.**
4. **Provider vs deployer classification** per §8. Default assumption for any repo shipping a product under its own brand: **provider**. Check upstream ToS for an Art 25(2) "not for high-risk use" specification.
5. **Annex III pattern match** → if hit, run the **Art 6(3)** filter, **but terminate on "performs profiling of natural persons"** (always high-risk, no derogation). If derogating, surface the **Art 6(4)** documentation + **Art 49(2)** registration duty — do not let users think the derogation is an exit.
6. **If high-risk:** deadline is **2 Dec 2027** (Annex III) or **2 Aug 2028** (Annex I), not August 2026. Check **Art 111(2)** grandfathering. Then generate Annex IV, defaulting to the **point 7 "no harmonised standards"** branch.
7. **If shipping a GPAI model:** Arts 53/54/55, Annexes XI/XII, 10²⁵ FLOP check, copyright/TDM policy, public training-data summary. Live since 2 Aug 2025; Commission enforcement since 2 Aug 2026.

---

### Primary sources index
- AI Act full text (consolidated, amendment-annotated): https://artificialintelligenceact.eu/ — per-article at `/article/{n}/`, per-annex at `/annex/{n}/`
- AI Act OJ: https://eur-lex.europa.eu/eli/reg/2024/1689/oj
- Digital Omnibus on AI OJ: https://eur-lex.europa.eu/eli/reg/2026/1744/oj *(AWS WAF — use a browser)*
- Commission AI regulatory framework: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- GPAI Code of Practice: https://digital-strategy.ec.europa.eu/en/policies/contents-code-gpai
- Standardisation FAQ: https://digital-strategy.ec.europa.eu/en/faqs/understanding-standardisation-ai-act
- Draft high-risk classification guidelines: https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems
- CEN-CENELEC JTC 21: https://jtc21.eu/ | https://www.cencenelec.eu/areas-of-work/cen-cenelec-topics/artificial-intelligence/
- Law-firm analyses of the Omnibus: Gibson Dunn https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/ · Hunton https://www.hunton.com/privacy-and-cybersecurity-law-blog/eu-digital-omnibus-on-ai-enters-into-force · Cooley https://cdp.cooley.com/digital-ai-omnibus-delays-key-deadlines-introduces-new-rules/ · DLA Piper https://www.dlapiper.com/en/insights/publications/2026/06/eu-commission-draft-guidelines-on-classification-of-high-risk-ai-systems-key-points

*Working files (extracted plain text of every article and annex cited) are in `/tmp/claude-0/-home-user-LexHack/8d293bf1-63d8-5ed8-997b-978b5b61df90/scratchpad/pages/`.*
