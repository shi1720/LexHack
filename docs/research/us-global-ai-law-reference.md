# Non-EU AI Regulation — Rule Pack Research Report
**Research date: 15 September 2026.** Every duty below is written as a discrete, auditable bullet with a source URL. Confidence markers: **[HIGH]** = confirmed against primary source (statute/regulation/official site) this session; **[MED]** = confirmed against reputable law-firm secondary source; **[LOW]** = single or vendor-blog source, verify before shipping.

---

## ⚠️ Headline corrections — five of your premises have changed

| Your premise | Reality as of Sept 2026 |
|---|---|
| Colorado SB 24-205 delayed to June 30, 2026 | **Repealed and replaced.** SB 26-189 signed May 14, 2026; new ADMT framework effective **Jan 1, 2027**. SB 24-205 was also preliminarily **enjoined** in April 2026 (xAI v. Colorado, DOJ intervening). It never took effect. |
| Illinois HB 3773 with IDHR rules | Statute in force Jan 1, 2026, but **IDHR withdrew its proposed Subpart J rules on June 2, 2026**. No final rules exist. |
| CA SB 942 effective Jan 1, 2026 | Delayed by AB 853 to **Aug 2, 2026** (now in force); platform duties Jan 1, 2027; capture devices Jan 1, 2028. |
| CPPA ADMT regs | ADMT duties bite **Jan 1, 2027**; risk-assessment duty started Jan 1, 2026. |
| "Any federal preemption push?" | **Yes, a major one.** Dec 11, 2025 EO + DOJ AI Litigation Task Force (Jan 9, 2026) + White House National Policy Framework (Mar 20, 2026). No federal statute yet. |

Also material for your EU comparison: the **EU AI Act's Annex III high-risk obligations moved from Aug 2, 2026 → Dec 2, 2027** (Annex I embedded → Aug 2, 2028) via the Digital Omnibus, in force July 27, 2026.

---

## 1. Colorado

### 1.1 SB 24-205 (the "Colorado AI Act") — DEAD. Do not build a live rule pack.

- Signed May 17, 2024; codified C.R.S. §§ 6-1-1701 to 6-1-1707. Original compliance date Feb 1, 2026. [HIGH] https://leg.colorado.gov/bills/sb24-205
- **SB 25B-004** (signed Aug 28, 2025, special session) pushed the date to **June 30, 2026**. [MED] https://leg.colorado.gov/bills/sb25b-004
- **April 27, 2026**: federal magistrate in D. Colo. enjoined enforcement after xAI's constitutional challenge; DOJ intervened on xAI's side April 24, 2026 — first federal attempt to invalidate a state AI law. [MED] https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/
- **May 14, 2026**: SB 26-189 signed, **repealing and reenacting** Part 17. [HIGH] https://leg.colorado.gov/bills/sb26-189

**Historical duties (for reference only — all removed):** duty of reasonable care against algorithmic discrimination (developers §6-1-1702, deployers §6-1-1703); deployer risk-management program aligned to NIST AI RMF or ISO/IEC 42001; impact assessments **at least annually and within 90 days after any intentional and substantial modification**, retained **3 years** after final deployment, with a statement on whether use varied from the developer's intended uses (§6-1-1703(3)); **90-day AG notification** on discovering algorithmic discrimination; public website statement/inventory of high-risk systems. [HIGH for §6-1-1703 impact-assessment mechanics] https://law.justia.com/codes/colorado/title-6/fair-trade-and-restraint-of-trade/article-1/part-17/section-6-1-1703/ · [MED for removals] https://www.hklaw.com/en/insights/publications/2026/05/colorado-governor-signs-sb-189

### 1.2 SB 26-189 — Colorado ADMT Act (effective Jan 1, 2027) — build this instead

Scope: "covered ADMT" = automated decision-making technology **used to materially influence a consequential decision**. "Consequential decision" = decision affecting access to, eligibility for, or terms of: **education, employment, housing, financial/lending services, insurance, health care, essential government services** (seven domains). [MED] https://leg.colorado.gov/bills/sb26-189

Section numbers below are from a secondary framework mapping — **verify against the enrolled bill before shipping** [LOW]: https://docs.modulos.ai/frameworks/colorado-sb189

**Developer duties (§6-1-1702)**
- [ ] MUST provide each deployer technical documentation stating the covered ADMT's **intended uses and known harmful/inappropriate uses**.
- [ ] MUST document **categories of training data**.
- [ ] MUST document **known limitations and risks**.
- [ ] MUST provide **instructions for appropriate use, monitoring, and meaningful human review**.
- [ ] MUST provide information the deployer needs for its own consumer disclosures.
- [ ] MUST **notify deployers of material updates or modifications** to the covered ADMT.
- [ ] MUST **retain compliance records ≥ 3 years**.

**Deployer duties (§§6-1-1703, 6-1-1704)**
- [ ] MUST give **clear and conspicuous pre-use notice**, *before* the consequential decision, that covered ADMT is or will be used — accessible to consumers with disabilities and limited English proficiency.
- [ ] On an **adverse outcome materially influenced by covered ADMT**, MUST provide **within 30 days**: a plain-language description of the decision and the ADMT's role; a simple-to-follow process to request more information; and an explanation of the consumer's rights.
- [ ] MUST **retain records ≥ 3 years after each consequential decision**.
- [ ] MUST designate trained individuals **authorized to override** the ADMT outcome during human review.

**Consumer rights (§6-1-1705)**
- [ ] Right to **request the personal data** used in the decision.
- [ ] Right to **correct factually incorrect or materially inaccurate data**.
- [ ] Right to **meaningful human review and reconsideration** after an adverse outcome — qualified **"to the extent commercially reasonable"** (note: this is a soft predicate, not a clean binary; flag it in your rule pack).

**Enforcement (§6-1-1706)**
- [ ] AG exclusive enforcement via the Colorado Consumer Protection Act (deceptive trade practice). **No private right of action.**
- [ ] **60-day notice-and-cure** required before enforcement, except knowing/repeated violations. Cure provision **sunsets Jan 1, 2030**.
- [ ] AG **must adopt clarifying rules by Jan 1, 2027** — your rule pack will need a refresh hook for this.

**Exemptions**: FERPA institutions, creditors complying with federal adverse-action notice rules, state-regulated insurers (deemed compliant if subject to C.R.S. §10-3-1104.9), FDA-regulated medical devices, HIPAA entities — with employment decisions generally *not* exempted. [MED] https://www.ebglaw.com/workforce-bulletin/inside-colorados-senate-bill-26-189-impacts-and-implications-for-employers

**Other Colorado AI laws now in force:** C.R.S. §10-3-1104.9 (insurer external consumer data / predictive models; expanded to private passenger auto and health benefit plans effective Oct 15, 2025); **HB 26-1139** (AI in health insurance coverage decisions, signed June 2, 2026); **HB 26-1195** (AI in psychotherapy, signed June 3, 2026). [LOW — verify] https://www.ailawsbystate.com/blog/colorado-ai-act-compliance-guide-2026

---

## 2. NYC Local Law 144 of 2021 (AEDT bias audits) — **fully verified against the primary rule text**

Statute: NYC Admin. Code §§ 20-870 to 20-874. Rules: **6 RCNY §§ 5-300 to 5-304** (Subchapter T). Enforcement began **July 5, 2023**. Primary source (DCWP Notice of Adoption of Final Rule): https://rules.cityofnewyork.us/wp-content/uploads/2023/04/DCWP-NOA-for-Use-of-Automated-Employment-Decisionmaking-Tools-2.pdf [HIGH]

**Who is bound**
- Employers and employment agencies using an AEDT **in New York City** to screen candidates for employment or employees for promotion.
- **AEDT trigger — §5-300.** "To substantially assist or replace discretionary decision making" means *any one of*: (i) relying **solely** on a simplified output with no other factors; (ii) using a simplified output as one of a set of criteria where it is **weighted more than any other criterion**; (iii) using a simplified output **to overrule** conclusions derived from other factors including human decision-making. → This is cleanly codable as a 3-branch boolean.
- Carve-out: translation/transcription tools are **not** simplified outputs.

**Bias audit — §5-301**
- [ ] MUST NOT use or continue to use an AEDT if **more than one year** has passed since its most recent bias audit (§5-301(a)).
- [ ] Auditor must be an **independent auditor** (§5-300): not involved in using, developing or distributing the AEDT; no employment relationship with the employer/agency/vendor at any point during the audit; no direct or material indirect financial interest in them.
- [ ] **Selection-type AEDT (§5-301(b))**: MUST calculate **selection rate for each category**; **impact ratio for each category**; calculated **separately** for (i) **sex categories**, (ii) **race/ethnicity categories**, (iii) **intersectional categories of sex × ethnicity × race**; repeated **per group** if the AEDT classifies into groups; and MUST **state the number of individuals assessed who fall in an unknown category** and were excluded.
- [ ] **Scoring-type AEDT (§5-301(c))**: MUST calculate the **median score for the full sample** and the **scoring rate** (rate at which individuals in a category score **above the sample median**) per category, plus impact ratios across the same three category axes.
- [ ] **Formulas (§5-300)**: `Impact Ratio = selection rate for a category ÷ selection rate of the most selected category` **OR** `scoring rate for a category ÷ scoring rate of the highest scoring category`.
- [ ] **Categories** = EEO-1 Component 1 categories (42 U.S.C. §2000e-8(c); 29 C.F.R. §1602.7). Consistent with 29 C.F.R. §1607.4.
- [ ] **2% rule (§5-301(d))**: auditor MAY exclude a category representing **<2%** of the audit data from impact-ratio calculations — but the summary MUST then include the auditor's **justification** plus the **number of applicants and the selection/scoring rate** for the excluded category.

**Data requirements — §5-302**
- [ ] Bias audit MUST use **historical data** of the AEDT (may be pooled across employers using the same AEDT).
- [ ] An employer may rely on another's pooled historical data **only if** it contributed its own historical data to the auditor, **or** it has never used the AEDT.
- [ ] **Test data** permitted only if insufficient historical data exists for a statistically significant audit — and the summary MUST **explain why historical data was not used** and **describe how the test data was generated and obtained**.

**Publication — §5-303**
- [ ] **Before use**, MUST publish, clearly and conspicuously, **on the employment section of the website**: the **date of the most recent bias audit**; a **summary of results** including the **source and explanation of the data**, the **number of individuals in an unknown category**, and, **for all categories**, the **number of applicants/candidates**, the **selection or scoring rates**, and the **impact ratios**.
- [ ] MUST publish the **distribution date** (= the date the employer began using that AEDT).
- [ ] An **active hyperlink** satisfies this if clearly identified as a link to bias audit results.
- [ ] MUST keep the summary and distribution date posted **≥ 6 months after the latest use** of the AEDT for an employment decision.

**Candidate/employee notice — §5-304 + §20-871(b)**
- [ ] MUST notify NYC-resident candidates **at least 10 business days before use** of the AEDT, by *any* of: website employment section, the job posting, or US mail/email.
- [ ] MUST notify NYC-resident employees considered for promotion **at least 10 business days before use**, by *any* of: a written policy/procedure provided to employees, the job posting, or US mail/email.
- [ ] Notice MUST include **instructions for how to request an alternative selection process or a reasonable accommodation** under other laws, *if available*. **The rule does not require offering an alternative process** — only the instructions. (Common misreading; make this a notice-content check, not an opt-out check.)
- [ ] MUST publish on the employment section of the website, clearly and conspicuously, its **AEDT data retention policy**, the **type of data collected**, and the **source of the data**.
- [ ] MUST post **instructions for making a written request** for that information, and MUST **respond within 30 days** of a written request.
- [ ] If disclosure would violate law or interfere with a law enforcement investigation, MUST **provide an explanation** to the individual.

**Penalties — §20-872** [MED] https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-135842
- Up to **$500** for a first violation and each additional violation the **same day**; **$500–$1,500** for each subsequent violation.
- **Each day** an AEDT is used in violation = a **separate violation** of §20-871(a).
- **Failure to give any of the three notices** under §20-871(b)(1)–(3) = a **separate violation**.
- Enforced by **DCWP** (not the Commission on Human Rights).

**2026 status note**: NY State Comptroller audit (Dec 2, 2025) found DCWP enforcement "ineffective"; DCWP committed to proactive rather than complaint-only enforcement. Expect higher enforcement activity in 2026. [MED] https://www.osc.ny.gov/state-agencies/audits/2025/12/02/enforcement-local-law-144-automated-employment-decision-tools

---

## 3. Illinois

### 3.1 HB 3773 — Illinois Human Rights Act amendments (P.A. 103-0804, effective **Jan 1, 2026**)

Primary: https://www.ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html · [MED] https://www.jonesday.com/en/insights/2024/10/illinois-becomes-second-state-to-pass-broad-legislation-on-the-use-of-ai-in-employment-decisions

Amends **775 ILCS 5/2-102** (and adds definitions at 5/1-103).

- [ ] **Prohibited**: employer use of AI that **has the effect of subjecting employees to discrimination** on a protected basis with respect to **recruitment, hiring, promotion, renewal of employment, selection for training or apprenticeship, discharge, discipline, tenure, or terms/privileges/conditions of employment**. Note the **effects** standard — unlike Texas, no intent required.
- [ ] **Prohibited**: using **ZIP codes as a proxy** for protected classes.
- [ ] **Required**: employer **must provide notice** to the employee/applicant that AI is being used for those purposes. Failure to notify is **itself a civil rights violation**.
- Enforcement: IDHR charge → Human Rights Commission or circuit court; remedies include actual damages, civil penalties, attorney's fees, reporting obligations.

**⚠️ Rulemaking status — critical for your rule pack** [HIGH]
- IDHR published proposed **"Subpart J: Use of Artificial Intelligence in Employment"** (44 Ill. Adm. Code Part 2520) in the Illinois Register on **May 15, 2026** (50 Ill. Reg. 6794).
- IDHR **withdrew/postponed** the rulemaking on **June 2, 2026** and cancelled the June 10 hearing, citing the need for continued interagency collaboration; withdrawal published **June 26, 2026** (50 Ill. Reg. 8755). **No final rules have been adopted; no replacement has been noticed.**
- Sources: https://www.seyfarth.com/news-insights/illinois-department-of-human-rights-temporarily-withdraws-proposed-rules-on-use-of-artificial-intelligence-in-employment.html · https://ogletree.com/insights-resources/blog-posts/illinois-postpones-proposed-regulations-on-ai-in-employment/ · https://techne.ai/insights/idhr-ai-rulemaking-tracker/
- **Implication**: the statutory notice duty is binding, but **timing, content, format and retention are legally undefined**. Do NOT hard-code the withdrawn draft's specifics (job-posting notice, annual notice, 30-day notice of new systems, 4-year retention, product name/vendor disclosure) as mandatory. Encode them as **"recommended / proposed-but-withdrawn"** at most. Draft details: https://www.hinshawlaw.com/en/insights/blogs/employment-law-observer/illinois-adopts-new-ai-in-employment-regulations-what-employers-need-to-know-for-2026

### 3.2 BIPA — 740 ILCS 14 (in force since 2008; amended by SB 2979, effective Aug 2, 2024)

[MED] https://www.kslaw.com/news-and-insights/illinois-bipa-reform-takes-effect

Binary duties for any private entity collecting biometric identifiers/information (retina/iris scan, fingerprint, voiceprint, hand or face geometry) — highly relevant to face/voice AI:
- [ ] **§14/15(a)**: MUST have a **written, publicly available retention schedule and destruction guidelines**; MUST destroy on the earlier of purpose-satisfied or **3 years after last interaction**.
- [ ] **§14/15(b)**: BEFORE collection, MUST (1) **inform in writing** that biometric data is being collected/stored; (2) **inform in writing of the specific purpose and length of term**; (3) obtain a **written release** from the subject. (Post-2024, "written release" expressly includes **electronic signature**.)
- [ ] **§14/15(c)**: MUST NOT **sell, lease, trade or otherwise profit** from biometric data.
- [ ] **§14/15(d)**: MUST NOT **disclose/redisclose** without consent or a statutory exception.
- [ ] **§14/15(e)**: MUST store/transmit using the **reasonable standard of care** for the industry and at least as protectively as other confidential/sensitive information.
- **Damages (§14/20)**: **$1,000** per negligent violation; **$5,000** per intentional/reckless; plus fees. **Private right of action.**
- **2024 amendment**: repeated collection of the *same* biometric identifier from the *same* person by the *same* method = **one violation, one recovery** (overriding *Cothron v. White Castle*). The 7th Circuit has held the amendment applies retroactively.

---

## 4. California

### 4.1 SB 942 — California AI Transparency Act, as amended by AB 853 (Bus. & Prof. Code §22757 et seq.)

**Operative date moved from Jan 1, 2026 → Aug 2, 2026** by AB 853 (signed Oct 13, 2025). [MED] https://www.troutmanprivacy.com/2025/10/california-ai-transparency-act-amendments-signed-into-law/ · https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853

**Covered provider** = GenAI system publicly accessible in CA with **> 1,000,000 monthly visitors/users**. Applies to **image, video, audio** — **not text**.

Duties now in force (since Aug 2, 2026):
- [ ] MUST make available a **free, publicly accessible AI detection tool** that lets a user assess whether content was created/altered by the provider's system and returns available **system provenance data**.
- [ ] MUST offer the user the **option to include a manifest disclosure** (clear, conspicuous, appropriate for the medium, understandable to a reasonable person) in AI-generated content.
- [ ] MUST include a **latent disclosure** (machine-readable, conveying provider name, system name/version, creation time, and a unique identifier) in AI-generated/altered content, to the extent technically feasible and reasonable.
- [ ] MUST **revoke a third-party licensee's license within 96 hours** of learning the licensee modified the system so it no longer includes the latent disclosure; licensee MUST cease use upon revocation. *(96-hour figure is from the original SB 942 text — [LOW], verify against the amended code section.)*

Phased duties:
- [ ] **From Jan 1, 2027 — large online platforms** (> 2,000,000 unique monthly CA users; social media, file-sharing, mass-messaging, search): MUST **detect compliant provenance data**; MUST **display to users** whether content is AI-generated/substantially altered; MUST let users **inspect available provenance data**; MUST NOT **knowingly strip** compliant provenance data or digital signatures.
- [ ] **From Jan 1, 2027 — GenAI hosting platforms**: MUST provide manifest disclosure options and latent disclosures indicating CAITA compliance.
- [ ] **From Jan 1, 2028 — capture device manufacturers** (devices first produced for sale in CA on/after that date): MUST offer a latent-disclosure option for device/timestamp information and **embed latent disclosures by default**.

### 4.2 AB 2013 — Generative AI: Training Data Transparency (Civil Code Title 15.2, **§3110 et seq.**) — in force **Jan 1, 2026** [HIGH, verified against bill text]

https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013

- [ ] Applies to **developers** (incl. those who "substantially modify," meaning updates materially changing functionality/performance, including retraining) of GenAI systems/services **made available to Californians**, released **on or after Jan 1, 2022**, **regardless of compensation**.
- [ ] MUST **post documentation on the developer's website** about the training datasets, **on or before Jan 1, 2026 and before each time thereafter** a covered system or substantial modification is made available.
- [ ] Documentation MUST include all **12 categories** (§3111): (1) **sources or owners** of the datasets; (2) **how the datasets further the intended purpose**; (3) **number of data points** (general ranges permitted); (4) **types of data points**; (5) whether data is **protected by copyright/trademark/patent or in the public domain**; (6) whether datasets were **purchased or licensed**; (7) whether they include **personal information**; (8) whether they include **aggregate consumer information**; (9) any **cleaning, processing or other modification**, including purpose and method; (10) the **time period of data collection**, flagging ongoing collection; (11) the **dates the datasets were first used** in development; (12) whether **synthetic data generation** was used.
- [ ] **Exemptions (§3111(b))**: systems used solely for **security and integrity** purposes; systems for **aircraft operation in national airspace**; systems developed for **federal national security, military, or defense** purposes.
- No express statutory penalty — enforcement via UCL / AG. Trade-secret tension is unresolved: https://www.goodwinlaw.com/en/insights/publications/2026/01/alerts-otherindustries-californias-ab-2013-takes-effect

### 4.3 CPPA ADMT / risk assessment / cyber audit regulations (CCPA regs, finalized Sept 23, 2025)

https://www.cppa.ca.gov/announcements/2025/20250923.html · [MED] https://www.hunton.com/privacy-and-cybersecurity-law-blog/cppa-finalizes-ccpa-regulations-on-automated-decision-making-technology-risk-assessments-and-cybersecurity-audits

**Key gating concept**: ADMT duties attach when ADMT is used to make a **"significant decision"** and it **replaces or substantially replaces human judgment**. "Human involvement" is defined so the reviewer must be able to **understand and evaluate the output, review it, and alter the final decision** — a tokenistic rubber stamp does not count.

**ADMT duties — compliance date Jan 1, 2027**
- [ ] MUST provide a **pre-use notice** disclosing the use of ADMT for a significant decision and its consequences, before processing.
- [ ] MUST provide an **opt-out** of ADMT for significant decisions, subject to exceptions.
- [ ] **Human appeal exception**: a business may continue using ADMT without offering opt-out if it provides the consumer the ability to **appeal to a qualified human reviewer** with authority to overturn. → Encode as: `opt_out_offered OR human_appeal_available`.
- [ ] MUST honor **access/explanation requests**: explain the ADMT's purpose, the output as to that consumer, and how the logic was applied — i.e., a **right to explanation**.

**Risk assessments — duty began Jan 1, 2026; first submission due April 1, 2028**
- [ ] MUST conduct a risk assessment before initiating any of: **selling/sharing** personal information; processing **sensitive personal information**; using **ADMT for a significant decision**; **training ADMT** with personal information; **automated inference** of personal attributes.
- [ ] MUST **update at least every 3 years** and **within 45 days of a material change** to the processing activity.
- [ ] MUST **submit documentation/attestation to the CPPA by April 1, 2028** (and annually thereafter). *(Note: one reputable source states the underlying assessments must be completed by Dec 31, 2027 — the Jan 1, 2026 trigger vs Dec 31, 2027 completion framing differs between sources; verify the exact reg text before encoding.)* [MED, internally inconsistent across sources]

**Cybersecurity audits — annual, independent, 5-year record retention; certification to CPPA by revenue tier**
- [ ] **April 1, 2028** (> $100M revenue) · **April 1, 2029** ($50–100M) · **April 1, 2030** (< $50M).
- Scope must cover: MFA/secure authentication, encryption, account management, asset inventory, secure configuration, vulnerability scanning, **penetration testing**, audit logs, network monitoring, anti-malware, segmentation, vendor oversight, retention schedules, secure disposal, incident response, and training.

### 4.4 SB 53 — Transparency in Frontier Artificial Intelligence Act (TFAIA)

Signed **Sept 29, 2025**; effective **Jan 1, 2026**. Codified as **Bus. & Prof. Code Chapter 25.1, commencing with §22757.10** (Division 8). [MED] https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251001-transparency-in-frontier-artificial-intelligence-act-sb-53-california-requires-new-standardized-ai-safety-disclosures · https://fpf.org/blog/californias-sb-53-the-first-frontier-ai-law-explained/

- **Frontier model** = foundation model trained on **> 10²⁶ integer or floating-point operations**, including compute used in subsequent fine-tuning/RL/material modification.
- **Large frontier developer** = frontier developer whose annual revenue **including affiliates exceeded $500,000,000** in the preceding calendar year.

Duties:
- [ ] **Large frontier developers** MUST **write, implement, and clearly and conspicuously publish on their website a "frontier AI framework"** describing: incorporation of national/international/industry-consensus standards; how catastrophic risk is assessed; mitigations applied; **cybersecurity practices securing model weights**; and internal governance.
- [ ] **All frontier developers** MUST **publish a transparency report** on or before deploying a new or substantially modified frontier model, stating: release date, supported **modalities**, **intended uses**, **restrictions/conditions on deployment**, and **results of catastrophic-risk assessments**.
- [ ] MUST **report critical safety incidents to the California Office of Emergency Services within 15 days**, or **within 24 hours** where there is imminent risk of death or serious physical injury. "Critical safety incident" includes unauthorized access to or modification of model weights, catastrophic-risk harm, loss of control causing death/injury, and deceptive model behavior subverting developer controls.
- [ ] Large frontier developers MUST be able to **confidentially submit summaries of internal-use catastrophic-risk assessments** to Cal OES (mechanism Cal OES must establish).
- [ ] MUST NOT retaliate against **covered employees** raising catastrophic-risk concerns; **whistleblower channel** required.
- **Penalty**: civil penalties up to **$1,000,000 per violation**, AG-enforced.

### 4.5 California 2026 developments (very recent — Sept 2026)

- **Sept 9, 2026** — Newsom signed **SB 813** (McNerney): first-in-the-nation framework for **independent verification organizations** that assess AI systems/models for compliance with state law; and **AB 1405** (Bauer-Kahan): a **state registry for AI auditors** with independence, transparency and integrity standards. [HIGH — governor's office] https://www.gov.ca.gov/2026/09/09/governor-newsom-signs-first-in-the-nation-ai-safeguards-to-protect-californians-calls-on-the-federal-government-to-do-its-part/ — **Effective dates not stated in the release; check the enrolled bills. This is directly relevant to you: it may create a recognized auditor regime your tool can map to.**
- **Sept 10, 2026** — 13 child-safety bills signed, incl. **SB 1119** (companion chatbot safety for children: **independent child-safety audits, annual risk assessments, crisis protocols for suicidal ideation, parental controls, notification when a child disables safety settings**), **SB 867** (companion chatbot **toys**), **SB 1276** (AI-generated CSAM), **AB 1856** (age-verification signals), **AB 2** (civil penalties for injuries to children, reported up to **$1M per child**). [HIGH — governor's office] https://www.gov.ca.gov/2026/09/10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/
- **SB 7 "No Robo Bosses" was VETOED** Oct 13, 2025. Reintroduced as **SB 947** on Feb 2, 2026 (post-use notice only, narrower prohibitions) — **pending, not law**. Do not build a rule pack. [MED] https://ktslaw.com/en/insights/alert/2025/10/california%20governor%20vetoes%20the%20no%20robo%20bosses%20act
- **SB 1120** (Physicians Make Decisions Act, in force Jan 1, 2025; amends Health & Safety Code §1367.01, Insurance Code §10123.135): [ ] a **denial, delay or modification of care based on medical necessity MUST be made by a licensed physician or competent health care provider** — AI may not make it. Clean binary duty. [MED] https://www.fenwick.com/insights/publications/californias-sb-1120-regulates-ai-in-health-plan-utilization-review-and-management-activities-starting-in-january
- **SB 1001** (Bot Disclosure Act, Bus. & Prof. Code §§17940–17943, in force July 1, 2019): [ ] MUST NOT use a bot to communicate with a person in California **with intent to mislead about its artificial identity** in order to **incentivize a purchase/sale of goods or services in a commercial transaction** or **influence a vote in an election**; safe harbor if the bot gives a **clear, conspicuous, reasonably designed disclosure** that it is a bot. Note the **intent + purpose** double predicate — narrower than people assume. [MED] https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/
- **SB 243** (companion chatbots, signed Oct 13, 2025, in force **Jan 1, 2026**): [ ] MUST give **clear and conspicuous notice that the chatbot is AI** where a reasonable person could be misled into thinking it is human; [ ] MUST NOT operate a companion chatbot **unless the operator maintains a protocol** for preventing suicidal-ideation/self-harm content, using evidence-based detection and **referring at-risk users to crisis service providers**; **private right of action**. Transactional customer-service chatbots exempt. [MED] https://www.troutmanprivacy.com/2026/01/analyzing-the-new-ai-companion-chatbot-laws/

---

## 5. Texas — TRAIGA (HB 149), effective **Jan 1, 2026**

Codified at **Tex. Bus. & Com. Code Chapters 551–554**, principally **Chapter 552, "Artificial Intelligence Protection"** (§552.001 definitions). [HIGH] https://tcss.legis.texas.gov/resources/bc/htm/bc.552.htm · [MED] https://www.klgates.com/Pared-Back-Version-of-the-Texas-Responsible-Artificial-Intelligence-Governance-Act-Signed-Into-Law-6-24-2025 · https://www.lw.com/en/insights/texas-signs-responsible-ai-governance-act-into-law

**Scope**: persons who (1) develop or deploy AI systems in Texas; (2) produce a product/service **used by Texas residents**; or (3) promote, advertise or conduct business in the state. "AI system" = machine-based system that, for any explicit or implicit objective, infers from inputs how to generate outputs (content, decisions, predictions, recommendations) that can influence physical or virtual environments.

**Prohibited uses — all intent-based (this is the defining feature)**
- [ ] MUST NOT develop/deploy an AI system **with the intent to incite or encourage** a person to physically harm themselves or others, or to engage in criminal activity.
- [ ] MUST NOT develop/deploy an AI system **with the sole intent to infringe, restrict or otherwise impair** a person's federal constitutional rights.
- [ ] MUST NOT develop/deploy an AI system **with the intent to unlawfully discriminate** against a protected class. **Express statutory rule: disparate impact alone is insufficient to show intent.** → For your rule pack, this cannot be tested by a statistical bias check; it is a documentation/intent artifact check only. Sharp contrast with Illinois HB 3773 and NYC LL144.
- [ ] MUST NOT develop/distribute AI producing **CSAM, unlawful deepfake sexual content, or text-based conversations simulating child sexual conduct**.

**Government-only duties** (these do NOT apply to private employers):
- [ ] Governmental entities MUST **disclose to consumers** that they are interacting with an AI system (clear, conspicuous, plain language, before or at time of interaction).
- [ ] Governmental entities MUST NOT use AI for **social scoring** (evaluating/classifying people by social behavior or personal characteristics and assigning a score or similar valuation leading to detrimental treatment).
- [ ] Governmental entities MUST NOT use AI for **biometric identification** using publicly available data without consent where it infringes rights.
- [ ] Healthcare providers MUST **disclose AI use in treatment** to the patient before or at the time of service.
- **Explicitly NOT required of private employers**: impact assessments, risk management policies, consumer disclosures. TRAIGA was deliberately pared back from the Colorado/EU model.

**Safe harbors / affirmative defenses**
- [ ] Discovering a violation through **internal testing (red-teaming, adversarial testing)**, **developer or third-party feedback**, or **internal review using a recognized risk framework — expressly including the NIST AI Risk Management Framework** — supports an affirmative defense. → Encode NIST AI RMF conformance as a Texas defense artifact.
- [ ] Developers/deployers **are not liable** where an end user independently misuses the system for a prohibited purpose.

**Sandbox** (administered by Texas Department of Information Resources)
- Up to **36 months** of testing with regulatory relief; requires detailed system description, benefit assessment and risk-mitigation plan; **quarterly performance reports**; the AG **cannot file charges** during participation. The sandbox **cannot waive** the Subchapter B prohibitions.

**Enforcement & penalties**
- **Texas AG exclusive**; **no private right of action**; consumer complaint portal.
- **60-day notice-and-cure** after AG notice.
- **Curable violations: $10,000–$12,000** each. **Uncurable: $80,000–$200,000** each. **Continuing: up to $40,000/day.** State agencies may additionally suspend/revoke licenses and impose penalties up to $100,000.
- Also created the **Texas Artificial Intelligence Council** (advisory).

---

## 6. Utah and other state laws with checkable duties

### 6.1 Utah AI Policy Act (AIPA), SB 149 (2024), as amended

[MED] https://fpf.org/blog/chatbots-in-check-utahs-latest-ai-legislation/ · https://fpf.org/wp-content/uploads/2025/04/Overview-of-Utahs-2025-Enacted-AI-Legislation.pdf · Codified principally at Utah Code §13-2-12 and Title 13, Chapter 72 [LOW on exact sections]

- [ ] **Regulated occupations** (health, legal, accounting, mental health, etc.): a person using GenAI to interact with a consumer MUST **proactively and prominently disclose** at the start of the interaction that the consumer is interacting with GenAI, not a human.
- [ ] **All other consumer transactions** (as narrowed by **SB 226**, eff. May 7, 2025): disclosure required **only when (a) the consumer asks**, or **(b) the interaction is "high-risk"** — involving collection of sensitive personal information together with significant decisions in **financial, legal, medical or mental-health** contexts. → Two-branch conditional, not an always-on duty.
- [ ] **Safe harbor** under SB 226 for suppliers providing clear upfront disclosures.
- [ ] It is **not a defense** that GenAI made the violative statement — the deploying entity is responsible under the Utah Consumer Sales Practices Act.
- **Sunset**: extended by **SB 332** to **July 2027** — put an expiry flag on this rule pack.

### 6.2 Utah HB 452 — Mental health chatbots (eff. May 7, 2025)
- [ ] MUST **disclose that the chatbot is not human** — before the first interaction, on user request, and at the start of a session after 7 days' inactivity.
- [ ] MUST NOT **advertise products/services during the interaction** without clear disclosure of the ad and any paid relationship.
- [ ] MUST NOT **sell or share individually identifiable health information** (or user input) with third parties.
- [ ] MUST **file a policy** with the Utah Division of Consumer Protection documenting licensed-professional involvement, performance testing, and non-discrimination safeguards — an **affirmative defense** is available where this is properly documented.

### 6.3 Other state chatbot-disclosure laws in force by 2026
Six states have enacted chatbot-specific laws: **California, Washington, Utah, New Hampshire, Maine, Nebraska**. [MED] https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/ — I did **not** verify the individual Maine/New Hampshire/Nebraska/Washington statutory texts this session; treat as a research lead, not a finished rule pack. **Maine** has a general bot-disclosure requirement in consumer transactions.

### 6.4 New York RAISE Act — frontier models (effective **Jan 1, 2027**)
Signed **Dec 19, 2025**; **chapter amendment signed Mar 27, 2026** aligning it much more closely with California's TFAIA. [MED] https://www.wiley.law/alert-New-York-Finalizes-RAISE-Act-for-Frontier-AI-Models-Law-Takes-Effect-January-1-2027 · https://www.cooley.com/news/insight/2026/2026-03-31-new-yorks-frontier-ai-law-gets-a-california-makeover-with-some-key-differences
- Applies to frontier developers with **> $500M annual revenue**; frontier model = **> 10²⁶ FLOPs**, compute cost **> $100M**.
- [ ] MUST implement and publish a **written safety and security protocol / AI framework** (catastrophic-risk thresholds, mitigations, cybersecurity practices, internal governance, incident response).
- [ ] MUST report each **safety incident to NY DHSES within 72 hours** of learning of it, or of learning facts sufficient for a reasonable belief that one occurred. **← 72 hours vs California's 15 days. If you build one "frontier" rule pack, this deadline must be jurisdiction-parameterized.**

### 6.5 Insurance sector (concrete and often overlooked)
- **Colorado C.R.S. §10-3-1104.9** + DOI rules: insurers using **external consumer data sources and predictive models** must have a governance framework and test for **unfair discrimination**; scope expanded **Oct 15, 2025** to private passenger auto and health benefit plans.
- **NAIC Model Bulletin on the Use of AI by Insurance Companies** (adopted Dec 2023) — adopted by roughly half the states; imposes an **AIS Program** (written AI systems program) expectation. Guidance, not statute, but insurers are examined against it. [MED] https://content.naic.org/insurance-topics/artificial-intelligence · https://www.quarles.com/newsroom/publications/nearly-half-of-states-have-now-adopted-naic-model-bulletin-on-insurers-use-of-ai

---

## 7. US Federal

### 7.1 Executive orders and the preemption push — this is the big 2026 story

- **EO 14110** (Biden, Oct 2023) was **revoked** by **EO 14179, "Removing Barriers to American Leadership in AI"** (Jan 23, 2025).
- **July 2025**: *America's AI Action Plan* + three EOs, including **EO 14319 "Preventing Woke AI in the Federal Government"** (procurement-facing "truth-seeking / ideological neutrality" principles for LLMs bought by federal agencies).
- **OMB M-25-21** ("Accelerating Federal Use of AI through Innovation, Governance, and Public Trust") and **M-25-22** ("Driving Efficient Acquisition of AI in Government"), both **April 3, 2025**, replaced the Biden-era M-24-10/M-24-18. These bind **federal agencies**, not private parties, but define **"high-impact AI"** with duties including pre-deployment testing, AI impact assessments, ongoing monitoring, human oversight, and a documented waiver process — a useful control vocabulary. [MED] https://www.bakerbotts.com/thought-leadership/publications/2026/january/us-ai-law-update
- **EO of Dec 11, 2025 — "Ensuring a National Policy Framework for Artificial Intelligence."** [MED] https://www.paulhastings.com/insights/client-alerts/president-trump-signs-executive-order-challenging-state-ai-laws · https://www.whitecase.com/insight-alert/state-ai-laws-under-federal-scrutiny-key-takeaways-executive-order-establishing
  - **DOJ AI Litigation Task Force** — established by AG Bondi **Jan 9, 2026**; challenges state AI laws on Dormant Commerce Clause, preemption and First Amendment grounds. **As of the most recent reporting available, it had not yet filed suit** — but DOJ *did* intervene in **xAI's challenge to Colorado SB 24-205** in April 2026, which preceded the Colorado repeal.
  - **Commerce Secretary** directed to publish, by **March 11, 2026**, an evaluation identifying "onerous" state AI laws conflicting with federal policy, flagging laws that require AI to alter **truthful outputs** or compel disclosures raising First Amendment concerns, for referral to the Task Force.
  - **BEAD broadband funding** ($42B) conditioned to discourage state AI regulation.
  - **FTC** directed to issue a policy statement on when state laws requiring alterations to truthful AI outputs are preempted by the FTC Act §5; **FCC** to consider a federal AI reporting/disclosure standard.
  - **Express carve-outs from preemption**: child safety, AI compute/data-center infrastructure (except generally applicable permitting reform), state government procurement and use of AI, and other topics later determined.
- **March 20, 2026** — White House released its **National Policy Framework for Artificial Intelligence**, recommending Congress enact **broad preemption of state AI laws imposing "undue burdens."** [MED] https://www.ropesgray.com/en/insights/alerts/2026/03/the-white-house-legislative-recommendations-national-policy-framework-for-artificial-intelligence-an
- **Bottom line for your tool**: as of Sept 2026 there is **no comprehensive federal AI statute** and none appears imminent. But state rule packs carry **live legal risk of invalidation**. I recommend a per-rule `preemption_risk` and `litigation_status` field. Colorado is the proof case: a state AI law can go from enacted → enjoined → repealed in under 30 days.

### 7.2 NIST AI RMF 1.0 (NIST AI 100-1) — verbatim core

Released Jan 26, 2023. Voluntary, but it is a **statutory affirmative defense in Texas TRAIGA** and was the named benchmark in the repealed Colorado law, so it is worth encoding as a control catalogue. Primary source: https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF/Core_And_Profiles/5-sec-core [HIGH]

**The four functions**: **GOVERN** (cross-cutting; organizational accountability, policies, culture) · **MAP** (establish context, identify risks) · **MEASURE** (analyze, assess, benchmark, monitor) · **MANAGE** (prioritize, treat, respond, recover).

Verbatim subcategories (exact text, use these as control IDs):
- **GOVERN 1.1** — "Legal and regulatory requirements involving AI are understood, managed, and documented."
- **GOVERN 1.2** — "The characteristics of trustworthy AI are integrated into organizational policies, processes, procedures, and practices."
- **GOVERN 4.1** — "Organizational policies and practices are in place to foster a critical thinking and safety-first mindset in the design, development, deployment, and uses of AI systems."
- **MAP 1.1** — "Intended purposes, potentially beneficial uses, context-specific laws, norms and expectations, and prospective settings in which the AI system will be deployed are understood and documented."
- **MAP 2.3** — "Scientific integrity and TEVV considerations are identified and documented, including those related to experimental design, data collection and selection."
- **MAP 5.1** — "Likelihood and magnitude of each identified impact (both potentially beneficial and harmful) based on expected use, past uses of AI systems in similar contexts, public incident reports, feedback from those external to the team."
- **MEASURE 2.3** — "AI system performance or assurance criteria are measured qualitatively or quantitatively and demonstrated for conditions similar to deployment setting(s)."
- **MEASURE 2.11** — "Fairness and bias – as identified in the map function – are evaluated and results are documented."
- **MANAGE 2.2** — "Mechanisms are in place and applied to sustain the value of deployed AI systems."
- **MANAGE 4.1** — "Post-deployment AI system monitoring plans are implemented, including mechanisms for capturing and evaluating input from users and other relevant AI actors, appeal and override, decommissioning, incident response, recovery, and change management."

Other high-value IDs for auditable duties (paraphrased category outcomes, IDs exact): GOVERN 1.6 (AI system **inventory**), GOVERN 1.7 (safe **decommissioning**), GOVERN 2.1 (documented roles/responsibilities), GOVERN 3.2 (human-AI configuration and **oversight** roles), GOVERN 6.1 (third-party/supply-chain policies), MAP 2.2 (documented knowledge limits and human oversight), MAP 3.5 (human oversight processes defined and assessed), MEASURE 1.3 (**independent assessors** involved), MEASURE 2.7 (security and resilience), MEASURE 2.9 (model explained, validated, documented), MEASURE 2.10 (privacy risk), MEASURE 3.3 (feedback processes for end users and impacted communities), MANAGE 1.4 (residual risk documented), MANAGE 3.2 (pre-trained models monitored), MANAGE 4.3 (incidents communicated; response tracked).

**⚠️ Version risk**: pursuant to America's AI Action Plan, **NIST is revising the AI RMF to remove references to misinformation, DEI, and climate change**. MEASURE 2.11 (fairness and bias) and GOVERN 3.x (workforce diversity/equity/inclusion) are the most likely to change. NIST has signaled a two-number versioning scheme with formal community review no later than 2028; an **AI RMF Profile on Trustworthy AI in Critical Infrastructure** concept note was released April 7, 2026. **Version-pin your NIST control IDs.** [MED] https://www.nist.gov/itl/ai-risk-management-framework · https://oecd.ai/en/dashboards/policy-initiatives/nist-ai-risk-management-framework

### 7.3 NIST AI 600-1 — Generative AI Profile (July 26, 2024)

[MED] https://www.nist.gov/itl/ai-risk-management-framework · https://docs.modulos.ai/frameworks/nist-ai-rmf/generative-ai-profile

- A **cross-sectoral profile** of the AI RMF. It adds **no new subcategories**; it supplies **200+ suggested actions** mapped to the four functions using the prefixes **GV, MP, MS, MG** (e.g. `GV-1.1-001`, `MS-2.11-003`). Action IDs follow the pattern `<FUNCTION>-<subcategory>-<sequence>`.
- **12 GenAI risk categories**: CBRN Information or Capabilities; Confabulation; Dangerous, Violent or Hateful Content; Data Privacy; Environmental Impacts; Harmful Bias and Homogenization; Human-AI Configuration; Information Integrity; Information Security; Intellectual Property; Obscene, Degrading and/or Abusive Content; Value Chain and Component Integration.
- **Named in Texas TRAIGA** as one of the frameworks whose internal review supports the affirmative defense.
- Same revision risk as AI RMF 1.0 (Information Integrity and Harmful Bias categories are directly in the crosshairs of the Action Plan directive).

---

## 8. Other jurisdictions worth a rule pack

### 8.1 United Kingdom — **the ADM law changed materially on 5 Feb 2026**

- **No UK AI Act.** The UK retains a sectoral, regulator-led approach (the 2023 pro-innovation white paper's five principles). The main *binding* AI rules come through data protection law.
- **Data (Use and Access) Act 2025, s.80 + Sch.6**, in force **5 February 2026** under the **Commencement No. 6 Regulations 2026 (SI 2026/82)**: **Article 22 UK GDPR is replaced by Articles 22A–22D.** [HIGH — legislation.gov.uk] https://www.legislation.gov.uk/ukpga/2025/18/section/80 · https://www.legislation.gov.uk/uksi/2026/82/regulation/2/made
  - **Art 22A**: a decision is "based solely on automated processing" if there is **no meaningful human involvement**; a decision is "significant" if it produces a **legal effect** or **similarly significant effect**.
  - **Art 22B/22C — the regime flipped from prohibition-with-exceptions to permission-with-safeguards.** For **non-special-category** data, a controller MAY make significant solely-automated decisions **provided the Art 22C safeguards are in place and documented**.
  - **Art 22C safeguards — four discrete, auditable duties:**
    - [ ] MUST provide the data subject with **information about the decision** (transparency, before the decision is taken).
    - [ ] MUST enable the data subject to **make representations**.
    - [ ] MUST enable the data subject to **obtain human intervention** from the controller.
    - [ ] MUST enable the data subject to **contest the decision**.
  - **Art 22B**: significant solely-automated decisions based on **special category data remain restricted** — permitted only on **explicit consent**, or **substantial public interest** where the decision is necessary for a contract or required by law. **"Recognised legitimate interests" cannot be the lawful basis** for such ADM.
- **ICO draft ADM & profiling guidance**: consultation **31 March – 29 May 2026**; **final guidance expected summer 2026** — check for publication before you ship a UK pack. ICO position: human involvement must be **active, not tokenistic**; the reviewer must be **trained and qualified to understand the system's logic, outputs, limitations and risks** and must have authority to change the outcome; **designing or building the system is not meaningful involvement**. [MED] https://www.insideprivacy.com/united-kingdom-2/uk-ico-consults-on-draft-automated-decision-making-guidance-and-sets-expectations-for-adm-in-recruitment/
- **New statutory duty**: **The Data Protection Act 2018 (Code of Practice on Artificial Intelligence and Automated Decision-Making) Regulations 2026 (SI 2026/425)**, in force **12 May 2026**, **require the Information Commissioner to prepare a statutory Code of Practice on processing personal data in developing and using AI and ADM**, including a **mandatory children's data component**. A statutory code is admissible in evidence and courts/tribunals must take it into account — so this will become the closest thing the UK has to an AI rulebook. [HIGH — legislation.gov.uk] https://www.legislation.gov.uk/uksi/2026/425/made · [MED] https://www.arnoldporter.com/en/perspectives/advisories/2026/08/the-icos-new-statutory-duty-to-produce-an-ai-code-of-practice

### 8.2 Canada — **AIDA is dead; there is no Canadian AI Act**

[MED] https://montrealethics.ai/the-death-of-canadas-artificial-intelligence-and-data-act-what-happened-and-whats-next-for-ai-regulation-in-canada/ · https://srinstitute.utoronto.ca/news/whats-next-for-aida
- **Bill C-27 (containing AIDA) died on the order paper on 6 January 2025** with prorogation. **Not reintroduced as of mid-2026.**
- Post-April-2025 election, a **Minister of AI and Digital Innovation** (Evan Solomon) was created; he has stated AIDA **will not return as drafted** and any future framework will be "light, tight, right." A national AI strategy consultation summary was published **February 2026**.
- **What actually binds in Canada today**: **PIPEDA**; **Quebec Law 25** (the strictest ADM rules in Canada — notice at or before an exclusively automated decision, plus on request the personal information used, the principal factors, and the right to have the decision reviewed by a person); the **voluntary ISED Code of Conduct on Generative AI**; and sectoral directives (OSFI E-23 for financial institutions, the Treasury Board **Directive on Automated Decision-Making** with its Algorithmic Impact Assessment for federal institutions, Health Canada for medical devices).
- **Recommendation**: build a **Quebec Law 25 §12.1** pack rather than an AIDA pack.

### 8.3 Brazil — PL 2338/2023 **not yet law**
- **Senate approved 10 December 2024.** Referred to the **Chamber of Deputies**, distributed to committees (Labour; Culture; Education; Consumer Protection; Science & Technology; Constitution & Justice). **As of Sept 2026 it has not passed the Chamber** and still requires presidential assent. [MED] https://www.loc.gov/item/global-legal-monitor/2025-05-23/brazil-senate-advances-discussions-on-bill-to-regulate-ai-use/ · https://www.demarest.com.br/en/inteligencia-artificial-reacende-debates-na-camara-dos-deputados/
- Structure if enacted: EU-style risk tiers (excessive risk prohibited / high risk with governance obligations), transparency and explanation rights, and a national oversight authority (SIA, coordinated by ANPD). **Do not ship as in-force.** Note that **LGPD Art. 20** already gives a right to review of decisions made solely on automated processing affecting the data subject's interests.

### 8.4 South Korea — **AI Basic Act: CONFIRMED in force 22 January 2026**
Framework Act on the Development of Artificial Intelligence and Establishment of a Foundation for Trustworthiness; **the Act and its Enforcement Decree both took effect 22 January 2026**. MSIT administers; first Enforcement Decree draft was released 8 Sept 2025. [MED] https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways · https://fpf.org/blog/south-koreas-new-ai-framework-act-a-balancing-act-between-innovation-and-regulation/ · English translation: https://cset.georgetown.edu/wp-content/uploads/t0625_south_korea_ai_law_EN.pdf

- [ ] Operators of **generative AI** and **high-impact AI** MUST **notify users in advance** that the product/service is developed using / operates on AI.
- [ ] Operators providing AI-generated **sound, image or video that is difficult to distinguish from human-created content** MUST provide **clear notice that it is an AI output**. (Virtual/synthetic content that could be mistaken for reality gets a stronger, non-removable marking duty.)
- [ ] Operators of **high-impact AI** (energy, healthcare, nuclear, biometrics, hiring, loan screening, public services, transport, etc.) MUST: conduct **impact assessments on fundamental rights before deployment**; **provide meaningful explanations of AI outcomes**; establish and **document risk management and safety measures**; ensure **human oversight**; and retain documentation.
- [ ] **Extraterritorial**: foreign operators above a threshold MUST **designate a domestic representative in Korea**.
- Penalties are comparatively modest (administrative fines up to ~KRW 30M). Government signalled a grace/guidance period for the first year — **verify current enforcement posture before encoding penalties**. [LOW on the grace period]

### 8.5 China — labelling rules **in force since 1 September 2025**
[MED] https://www.twobirds.com/en/insights/2025/new-ai-content-labelling-rules-in-china-what-are-they-and-how-do-they-compare-to-the-eu-ai-act · https://www.chinalawtranslate.com/en/ai-labeling/ · https://www.loeb.com/en/insights/publications/2025/03/chinas-ai-labeling-measures-and-mandatory-national-standards-take-effect-september-1

Three-layer stack:
1. **Algorithmic Recommendation Provisions** (in force 1 Mar 2022) — algorithm filing with CAC, opt-out of personalised recommendation.
2. **Deep Synthesis Provisions** (in force 10 Jan 2023) — consent for biometric editing, security assessment, labelling of deep synthesis content.
3. **Interim Measures for the Management of Generative AI Services** (in force 15 Aug 2023) — security assessment and algorithm filing for services with **public opinion attributes or social mobilisation capacity**; training data legality; content labelling.
4. **Measures for Labelling AI-Generated and Synthetic Content** — issued 14 Mar 2025 by CAC/MIIT/MPS/NRTA, **effective 1 September 2025**, with **mandatory national standard GB 45438-2025**.

- [ ] Service providers MUST add **explicit labels** (human-perceptible — visible text, audio cue, or prominent marking) to AI-generated **text, images, audio, video and virtual scenes**.
- [ ] Service providers MUST add **implicit labels** in the **file metadata**, carrying at minimum the **provider code/name, content ID, and generation timestamp**, per **GB 45438-2025**.
- [ ] **Distribution platforms** MUST verify implicit metadata, label content they detect or suspect to be AI-generated, and MUST NOT provide tools to remove/forge/conceal labels.
- [ ] Users MUST NOT maliciously remove, alter, forge or conceal labels.
- This is the closest real-world analogue to California SB 942 — a shared provenance/watermarking rule pack could serve both, with different metadata schemas (C2PA-style for CA, GB 45438-2025 for CN).

### 8.6 India — light-touch guidelines plus **binding new IT Rules**
[MED] https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/india-targets-deepfakes-and-ai-generated-content-key-changes-under-meitys-2026-102mjwn
- **No AI statute.** **India AI Governance Guidelines** (MeitY, November 2025) are a **non-binding** risk-based reference under the IndiaAI Mission.
- **Binding**: MeitY's **2026 Amendments to the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021**, notified **10 February 2026**, **effective 20 February 2026**, regulating **"Synthetically Generated Information" (SGI)** = information that appears reasonably authentic but is artificially or algorithmically generated, modified or altered using a computer resource.
  - [ ] Non-prohibited SGI MUST be **clearly and prominently labelled** — **visual labels for visual SGI, audio disclosures for audio SGI**.
  - [ ] Where feasible, intermediaries MUST **embed permanent metadata or unique identifiers** tracing the computer resource used to generate/alter the content.
  - [ ] Significant social media intermediaries MUST **deploy automated detection tools** and MUST action prohibited SGI within a **3-hour takedown window** — **missing it forfeits safe harbour under IT Act §79**. (Reported as 3 hours across sources; the standard rule 3(1)(d) window is 36 hours, so this expedited deepfake window is worth verifying against the gazette notification. [LOW])
- Also relevant: **DPDP Act 2023** and the **DPDP Rules notified in 2025** — note the DPDP Act contains **no ADM/profiling right** analogous to GDPR Art 22.

---

## 9. GDPR — Article 22, Articles 13–15, Article 35, and the AI Act relationship

*(Article texts below are stated from the Regulation itself; the CJEU case law was verified this session. Canonical text: https://eur-lex.europa.eu/eli/reg/2016/679/oj)*

### 9.1 Article 22 — automated individual decision-making, including profiling

**Trigger (Art 22(1))**: a decision **based solely on automated processing, including profiling**, which produces **legal effects** concerning the data subject or **similarly significantly affects** them. The data subject "shall have the right not to be subject to" such a decision — the EDPB and CJEU read this as a **general prohibition**, not an opt-in right.

- [ ] **Gate check**: Is the decision solely automated? Token human sign-off without authority/competence to change the outcome does **not** remove it from Art 22 (EDPB WP251rev.01).
- [ ] **Lawfulness (Art 22(2))**: permitted **only** if (a) **necessary for entering into or performance of a contract**, (b) **authorised by Union or Member State law** with suitable safeguards, or (c) based on **explicit consent**.
- [ ] **Mandatory safeguards (Art 22(3))** for grounds (a) and (c) — three discrete duties: the controller MUST implement suitable measures to safeguard rights, at minimum the right to **obtain human intervention on the part of the controller**, to **express his or her point of view**, and to **contest the decision**. → Directly codable: `human_intervention_available AND viewpoint_channel_available AND contest_mechanism_available`.
- [ ] **Art 22(4)**: such decisions MUST NOT be based on **special categories of data (Art 9(1))** unless **Art 9(2)(a) explicit consent** or **Art 9(2)(g) substantial public interest** applies, **and** suitable safeguards are in place.

**Controlling case law (verified):**
- **C-634/21, SCHUFA (7 Dec 2023)**: the **generation of a credit score** is itself an Art 22(1) "decision" where the score **plays a determining role** in the third party's decision. The obligation falls on the **scoring agency**, not just the lender. → For your tool: **upstream model/score providers can be directly in scope**, not merely the deploying business. https://www.aoshearman.com/en/insights/ao-shearman-on-data/cjeu-rules-that-a-credit-score-constitutes-automated-decision-making-under-the-gdpr
- **C-203/22, CK v Dun & Bradstreet Austria (27 Feb 2025)**: "meaningful information about the logic involved" requires **concise, transparent, intelligible and easily accessible information about the procedures and principles actually applied** so the data subject can understand which data were used **and how**. Communicating the algorithm itself is not required; a mere formula or bare description is **not** sufficient. **A trade secret is not a ground to refuse access** — the controller must instead **supply the information to the competent supervisory authority or court** to perform the balancing. https://www.twobirds.com/en/insights/2025/cjeu-decision-on-algorithmic-transparency-and-secret-protection-(cjeu-c-20322) · https://iapp.org/news/a/key-takeaways-from-the-cjeus-recent-automated-decision-making-rulings

### 9.2 Articles 13–15 — the transparency/explanation triad

Identical substantive item in all three:
- [ ] **Art 13(2)(f)** (data collected from the subject) and **Art 14(2)(g)** (data obtained elsewhere): at collection/within one month, the controller MUST inform the data subject of **the existence of automated decision-making, including profiling, referred to in Article 22(1) and (4)** and, at least in those cases, **meaningful information about the logic involved**, as well as **the significance and the envisaged consequences** of such processing for the data subject.
- [ ] **Art 15(1)(h)**: on a **subject access request**, the controller MUST provide the same three elements — existence of ADM, **meaningful information about the logic involved**, and **significance and envisaged consequences**. *(This is the provision litigated in C-203/22.)*
- [ ] **Art 12(1)**: all of the above MUST be in a **concise, transparent, intelligible and easily accessible form, using clear and plain language**.
- [ ] **Art 15(3)**: MUST provide a **copy of the personal data undergoing processing**.
- [ ] **Art 16**: **right to rectification** of inaccurate personal data — the GDPR analogue of the US "right to correct data" duties.
- [ ] **Art 21(1)–(2)**: **right to object** to processing based on legitimate interests (incl. profiling) and an **absolute right to object** to direct-marketing profiling.

**Three discrete auditable artefacts** for an AI system making decisions about people: (1) a **privacy notice clause** covering ADM existence + logic + consequences; (2) a **DSAR response template** producing the same under Art 15(1)(h); (3) a **human-review workflow** satisfying Art 22(3).

### 9.3 Article 35 — Data Protection Impact Assessment

- [ ] **Art 35(1)**: a DPIA is **mandatory** where processing, **in particular using new technologies**, is **likely to result in a high risk** to rights and freedoms.
- [ ] **Art 35(3)(a)**: DPIA is **required in particular** for "a **systematic and extensive evaluation of personal aspects** relating to natural persons which is **based on automated processing, including profiling**, and on which decisions are based that **produce legal effects** concerning the natural person or **similarly significantly affect** them." → Art 22 processing essentially always triggers a DPIA.
- [ ] **Art 35(3)(b)**: also required for **large-scale processing of special categories** or criminal conviction data; **35(3)(c)**: **systematic monitoring of a publicly accessible area on a large scale** (relevant to computer vision / biometric surveillance).
- [ ] **Art 35(7)** — minimum required contents (four discrete elements): (a) a **systematic description of the envisaged processing operations and purposes**, including the legitimate interest pursued; (b) an **assessment of necessity and proportionality**; (c) an **assessment of the risks** to data subjects' rights and freedoms; (d) the **measures envisaged to address the risks**, including safeguards, security measures and mechanisms to ensure protection of personal data and demonstrate compliance.
- [ ] **Art 35(2)**: MUST seek the advice of the **DPO** where one is designated.
- [ ] **Art 35(9)**: where appropriate, MUST **seek the views of data subjects** or their representatives.
- [ ] **Art 35(11)**: MUST **review** the DPIA where there is a change in the risk represented by the processing operations.
- [ ] **Art 36(1)**: MUST **consult the supervisory authority prior to processing** where the DPIA indicates high risk that the controller **cannot mitigate**.
- Each supervisory authority publishes an **Art 35(4) mandatory-DPIA list** — most list AI-driven scoring, automated decision-making, and biometric processing. National-list variation is a real problem for a single EU rule pack.

### 9.4 Relationship to the EU AI Act

- **The two instruments apply cumulatively.** AI Act **Art 2(7)** expressly preserves the GDPR: the AI Act "does not affect" the GDPR/LED/ePrivacy, and does not provide a legal basis for processing.
- **AI Act Art 26(9)**: deployers of Annex III high-risk AI systems who are obliged to carry out a **DPIA under GDPR Art 35** **shall use the information provided by the provider under Art 13** (instructions for use) to fulfil that obligation. → Direct statutory bridge between your EU AI Act pack and your GDPR pack.
- **AI Act Art 27**: a separate **Fundamental Rights Impact Assessment (FRIA)** is required of certain deployers (public bodies, private entities providing public services, and deployers of credit-scoring and life/health insurance risk-assessment systems). **Art 27(4)**: where any of the FRIA obligations are already met through the **GDPR DPIA**, the FRIA **complements** it — so build them as overlapping, not duplicative, checklists.
- **AI Act Art 86**: a **right to explanation of individual decision-making** — any person subject to a decision taken by a deployer on the basis of the output of an **Annex III high-risk AI system** (other than Annex III point 2) which **produces legal effects or similarly significantly affects** them **in a way they consider to have an adverse impact on their health, safety or fundamental rights** has the right to obtain **clear and meaningful explanations of the role of the AI system in the decision-making procedure and the main elements of the decision taken**. Note the structural parallel with Colorado SB 26-189's 30-day adverse-outcome explanation.
- **Timing (the 2026 change)**: prohibitions + AI literacy applied 2 Feb 2025; GPAI obligations 2 Aug 2025; **Annex III standalone high-risk obligations pushed from 2 Aug 2026 to 2 December 2027**, and **Annex I embedded high-risk to 2 August 2028**, by the Digital Omnibus, which entered into force **27 July 2026** (OJ 24 July 2026). Art 6(3) exemptions and transparency duties also shifted. [MED] https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal · https://www.praxikon.com/en/posts/digital-omnibus-high-risk-postponement-december-2027
- **Practical consequence for your product**: for 2026–2027, **GDPR Arts 22/13–15/35 are the operative, enforceable EU rules for AI decisions about people** — not the AI Act's high-risk chapter. Prioritise the GDPR pack.

---

## 10. Cross-cutting notes for building the rule packs

**Recommended per-rule metadata fields**, based on what actually varied across these regimes:
`jurisdiction` · `instrument` · `section` · `status` (in_force / enacted_not_yet_effective / proposed / vetoed / repealed / enjoined) · `effective_date` · `sunset_date` (Utah AIPA: July 2027; Colorado cure period: Jan 2030) · `rulemaking_pending` (Colorado AG by Jan 1 2027; Illinois IDHR indefinite; ICO code of practice) · `preemption_risk` · `enforcement_body` · `private_right_of_action` · `cure_period_days` · `penalty_min/max` · `source_url` · `verified_date`.

**Duty archetypes that recur and are genuinely binary** (good candidates for shared primitives):
1. **Pre-use disclosure that AI is involved** — CO SB 26-189 §6-1-1704; NYC §5-304; IL 775 ILCS 5/2-102; TX §552.x (gov't/health only); UT AIPA; KR AI Basic Act; CA SB 1001/SB 243; CPPA pre-use notice.
2. **Post-adverse-decision explanation, with a deadline** — CO: **30 days**; GDPR Art 15: **1 month**; EU AI Act Art 86; CPPA access/explanation.
3. **Human review / appeal of an adverse decision** — CO §6-1-1705 ("commercially reasonable"); CPPA human appeal exception; GDPR Art 22(3); UK Art 22C; CA SB 1120 (physician must decide); NIST MANAGE 4.1.
4. **Right to correct input data** — CO §6-1-1705; GDPR Art 16.
5. **Published artefact on a website** — NYC bias audit summary; CA AB 2013 training-data docs; CA SB 53 frontier framework + transparency report; NY RAISE Act protocol; (repealed) CO public statement.
6. **Incident report with a clock** — CA SB 53: **15 days / 24 hours**; NY RAISE: **72 hours**; India: **3-hour takedown**; (repealed) CO AG: 90 days.
7. **Provenance marking of synthetic content** — CA SB 942; China Labelling Measures + GB 45438-2025; India SGI rules; KR AI Basic Act; EU AI Act Art 50.
8. **Periodic assessment with a frequency and a retention period** — CPPA risk assessments (3 years / 45 days on material change); NYC bias audit (1 year); CO SB 26-189 records (3 years); CA cyber audits (annual, 5-year retention); (repealed) CO impact assessments (annual / 90 days / 3 years).

**Biggest modelling trap**: the **intent vs. effects** split. Texas TRAIGA requires **intent** and expressly says disparate impact is insufficient; Illinois HB 3773 uses an **effects** standard; NYC LL144 requires **measurement** of impact ratios but imposes **no substantive threshold** (publishing a 0.60 impact ratio is fully compliant). These three cannot share a discrimination check.

---

## 11. Explicit uncertainty register

1. **Colorado SB 26-189 section numbering (§§6-1-1701 to 6-1-1709)** comes from a vendor framework mapping. Verify against the enrolled bill / 2026 C.R.S. before shipping.
2. **CPPA risk-assessment dates**: sources conflict between "comply by Jan 1, 2026" and "complete by Dec 31, 2027," with submission April 1, 2028. Read the reg text.
3. **SB 942's 96-hour licensee-revocation duty** is from the original SB 942 text; confirm it survived AB 853 unchanged.
4. **India's 3-hour takedown window** is reported consistently in Indian press but conflicts with the standard 36-hour rule 3(1)(d) window — verify against the gazette notification.
5. **Korea AI Basic Act grace period** — widely reported but unconfirmed here; verify before encoding penalties as live.
6. **Maine / New Hampshire / Nebraska / Washington chatbot statutes** — identified but not individually verified this session.
7. **CA SB 813 and AB 1405 effective dates** — signed Sept 9, 2026; the governor's release gave no dates. These are only days old; the enrolled text is the only reliable source.
8. **NIST AI RMF revision** is in flight. MEASURE 2.11 and the GOVERN 3.x diversity/equity subcategories are the likeliest to change or disappear. Version-pin.
9. **The DOJ AI Litigation Task Force had not filed suit** as of the latest reporting I could confirm, but it intervened in the xAI/Colorado matter. Litigation status here changes month to month — re-check before publishing any state pack.
10. I could not retrieve the **Colorado AG's ADAI rulemaking page** (coag.gov/ai returned empty). Worth a manual check for the SB 26-189 rulemaking that must conclude by Jan 1, 2027.

---

### Full source list
Colorado: https://leg.colorado.gov/bills/sb24-205 · https://leg.colorado.gov/bills/sb25b-004 · https://leg.colorado.gov/bills/sb26-189 · https://law.justia.com/codes/colorado/title-6/fair-trade-and-restraint-of-trade/article-1/part-17/section-6-1-1703/ · https://www.hklaw.com/en/insights/publications/2026/05/colorado-governor-signs-sb-189 · https://www.nortonrosefulbright.com/en-us/knowledge/publications/18733d31/colorado-enacts-revised-ai-law · https://www.ebglaw.com/workforce-bulletin/inside-colorados-senate-bill-26-189-impacts-and-implications-for-employers · https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/ · https://docs.modulos.ai/frameworks/colorado-sb189
NYC: https://rules.cityofnewyork.us/wp-content/uploads/2023/04/DCWP-NOA-for-Use-of-Automated-Employment-Decisionmaking-Tools-2.pdf · https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page · https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-135842 · https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-135843 · https://www.osc.ny.gov/state-agencies/audits/2025/12/02/enforcement-local-law-144-automated-employment-decision-tools
Illinois: https://www.ilga.gov/ftp/legislation/103/BillStatus/HTML/10300HB3773.html · https://www.jonesday.com/en/insights/2024/10/illinois-becomes-second-state-to-pass-broad-legislation-on-the-use-of-ai-in-employment-decisions · https://www.seyfarth.com/news-insights/illinois-department-of-human-rights-temporarily-withdraws-proposed-rules-on-use-of-artificial-intelligence-in-employment.html · https://ogletree.com/insights-resources/blog-posts/illinois-postpones-proposed-regulations-on-ai-in-employment/ · https://techne.ai/insights/idhr-ai-rulemaking-tracker/ · https://www.hinshawlaw.com/en/insights/blogs/employment-law-observer/illinois-adopts-new-ai-in-employment-regulations-what-employers-need-to-know-for-2026 · https://www.kslaw.com/news-and-insights/illinois-bipa-reform-takes-effect
California: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013 · https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260AB853 · https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB53 · https://www.troutmanprivacy.com/2025/10/california-ai-transparency-act-amendments-signed-into-law/ · https://www.cppa.ca.gov/announcements/2025/20250923.html · https://www.hunton.com/privacy-and-cybersecurity-law-blog/cppa-finalizes-ccpa-regulations-on-automated-decision-making-technology-risk-assessments-and-cybersecurity-audits · https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_and_uid.pdf · https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251001-transparency-in-frontier-artificial-intelligence-act-sb-53-california-requires-new-standardized-ai-safety-disclosures · https://fpf.org/blog/californias-sb-53-the-first-frontier-ai-law-explained/ · https://www.gov.ca.gov/2026/09/09/governor-newsom-signs-first-in-the-nation-ai-safeguards-to-protect-californians-calls-on-the-federal-government-to-do-its-part/ · https://www.gov.ca.gov/2026/09/10/governor-newsom-signs-the-strongest-child-safety-chatbot-and-social-media-laws-in-the-nation/ · https://ktslaw.com/en/insights/alert/2025/10/california%20governor%20vetoes%20the%20no%20robo%20bosses%20act · https://www.fenwick.com/insights/publications/californias-sb-1120-regulates-ai-in-health-plan-utilization-review-and-management-activities-starting-in-january · https://www.goodwinlaw.com/en/insights/publications/2026/01/alerts-otherindustries-californias-ab-2013-takes-effect
Texas: https://tcss.legis.texas.gov/resources/bc/htm/bc.552.htm · https://law.justia.com/codes/texas/business-commerce-code/title-11/subtitle-d/chapter-552/ · https://www.klgates.com/Pared-Back-Version-of-the-Texas-Responsible-Artificial-Intelligence-Governance-Act-Signed-Into-Law-6-24-2025 · https://www.lw.com/en/insights/texas-signs-responsible-ai-governance-act-into-law · https://capitol.texas.gov/tlodocs/89R/analysis/html/HB00149S.htm
Utah / chatbots: https://fpf.org/blog/chatbots-in-check-utahs-latest-ai-legislation/ · https://fpf.org/wp-content/uploads/2025/04/Overview-of-Utahs-2025-Enacted-AI-Legislation.pdf · https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/ · https://www.troutmanprivacy.com/2026/01/analyzing-the-new-ai-companion-chatbot-laws/
New York State: https://www.wiley.law/alert-New-York-Finalizes-RAISE-Act-for-Frontier-AI-Models-Law-Takes-Effect-January-1-2027 · https://www.cooley.com/news/insight/2026/2026-03-31-new-yorks-frontier-ai-law-gets-a-california-makeover-with-some-key-differences · https://www.mofo.com/resources/insights/260105-new-york-enacts-the-raise-act-regulating-frontier-ai-models
Federal: https://www.paulhastings.com/insights/client-alerts/president-trump-signs-executive-order-challenging-state-ai-laws · https://www.whitecase.com/insight-alert/state-ai-laws-under-federal-scrutiny-key-takeaways-executive-order-establishing · https://www.ropesgray.com/en/insights/alerts/2026/03/the-white-house-legislative-recommendations-national-policy-framework-for-artificial-intelligence-an · https://www.bakerbotts.com/thought-leadership/publications/2026/january/us-ai-law-update · https://www.butzel.com/alert-department-of-commerce-report-on-state-artificial-intelligence-laws-expected-by-march-11-2026
NIST: https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF/Core_And_Profiles/5-sec-core · https://www.nist.gov/itl/ai-risk-management-framework · https://airc.nist.gov/airmf-resources/playbook · https://oecd.ai/en/dashboards/policy-initiatives/nist-ai-risk-management-framework · https://docs.modulos.ai/frameworks/nist-ai-rmf/generative-ai-profile
UK: https://www.legislation.gov.uk/ukpga/2025/18/section/80 · https://www.legislation.gov.uk/uksi/2026/82/regulation/2/made · https://www.legislation.gov.uk/uksi/2026/425/made · https://www.insideprivacy.com/united-kingdom-2/uk-ico-consults-on-draft-automated-decision-making-guidance-and-sets-expectations-for-adm-in-recruitment/ · https://www.arnoldporter.com/en/perspectives/advisories/2026/08/the-icos-new-statutory-duty-to-produce-an-ai-code-of-practice · https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2026/02/key-aspects-of-the-data--use-and-access--act-take-effect.html
Canada: https://montrealethics.ai/the-death-of-canadas-artificial-intelligence-and-data-act-what-happened-and-whats-next-for-ai-regulation-in-canada/ · https://srinstitute.utoronto.ca/news/whats-next-for-aida
Brazil: https://www.loc.gov/item/global-legal-monitor/2025-05-23/brazil-senate-advances-discussions-on-bill-to-regulate-ai-use/ · https://www.demarest.com.br/en/inteligencia-artificial-reacende-debates-na-camara-dos-deputados/
Korea: https://www.cooley.com/news/insight/2026/2026-01-27-south-koreas-ai-basic-act-overview-and-key-takeaways · https://fpf.org/blog/south-koreas-new-ai-framework-act-a-balancing-act-between-innovation-and-regulation/ · https://cset.georgetown.edu/wp-content/uploads/t0625_south_korea_ai_law_EN.pdf
China: https://www.chinalawtranslate.com/en/ai-labeling/ · https://www.twobirds.com/en/insights/2025/new-ai-content-labelling-rules-in-china-what-are-they-and-how-do-they-compare-to-the-eu-ai-act · https://www.loeb.com/en/insights/publications/2025/03/chinas-ai-labeling-measures-and-mandatory-national-standards-take-effect-september-1 · https://www.whitecase.com/insight-our-thinking/ai-watch-global-regulatory-tracker-china
India: https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/india-targets-deepfakes-and-ai-generated-content-key-changes-under-meitys-2026-102mjwn
GDPR / EU: https://eur-lex.europa.eu/eli/reg/2016/679/oj · https://www.twobirds.com/en/insights/2025/cjeu-decision-on-algorithmic-transparency-and-secret-protection-(cjeu-c-20322) · https://www.aoshearman.com/en/insights/ao-shearman-on-data/cjeu-rules-that-a-credit-score-constitutes-automated-decision-making-under-the-gdpr · https://iapp.org/news/a/key-takeaways-from-the-cjeus-recent-automated-decision-making-rulings · https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal · https://www.praxikon.com/en/posts/digital-omnibus-high-risk-postponement-december-2027
Insurance: https://content.naic.org/insurance-topics/artificial-intelligence · https://www.quarles.com/newsroom/publications/nearly-half-of-states-have-now-adopted-naic-model-bulletin-on-insurers-use-of-ai