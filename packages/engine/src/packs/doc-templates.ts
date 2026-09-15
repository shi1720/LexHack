import type { EvaluationContext } from '../types.js';

function heading(ctx: EvaluationContext, title: string, citation: string): string {
  return `# ${title}

> **System:** ${ctx.profile.name}
> **Legal basis:** ${citation}
> **Status:** DRAFT — scaffolded by Annex from evidence found in this repository. Every _TODO_ below is a question only a human in your organisation can answer.
> **Last reconciled with the codebase:** commit \`${(ctx.snapshot.commit ?? ctx.snapshot.id).slice(0, 12)}\`

`;
}

function evidenceList(ctx: EvaluationContext, signalIds: string[], emptyNote: string): string {
  const evidence = ctx.signals.evidenceFor(...signalIds).slice(0, 8);
  if (evidence.length === 0) return `_${emptyNote}_\n`;
  return evidence.map((e) => `- \`${e.path}:${e.line}\` — \`${e.snippet.trim()}\``).join('\n') + '\n';
}

// ---------------------------------------------------------------------------

export function riskManagementDoc(ctx: EvaluationContext): string {
  const findings = ctx.classification.findings.slice(0, 4);
  return (
    heading(ctx, 'Risk management system', 'Regulation (EU) 2024/1689, Article 9') +
    `## 1. Scope and lifecycle

Article 9(1) requires a risk management system that is *"a continuous iterative process planned and run throughout the entire lifecycle"*, subject to regular systematic review and updating. This document is that process's written form. It is reviewed:

- on every substantial modification to the system,
- on every serious incident (Article 73),
- at minimum every six months.

## 2. Identified risks (Article 9(2)(a)-(b))

Risks known and reasonably foreseeable under the intended purpose, **and under reasonably foreseeable misuse**.

| # | Risk to health, safety or fundamental rights | Source | Likelihood | Severity | Status |
|---|---|---|---|---|---|
${findings
  .map(
    (f, i) =>
      `| R${i + 1} | _TODO: describe the concrete harm_ | ${f.title} (${f.citations[0]?.locator ?? 'n/a'}) | _TODO_ | _TODO_ | Open |`,
  )
  .join('\n')}
| R${findings.length + 1} | Automation bias — the reviewer defers to the model rather than assessing it | Article 14(4)(b) | _TODO_ | _TODO_ | Open |
| R${findings.length + 2} | Feedback loop — outputs influence future training inputs | Article 15(4) | _TODO_ | _TODO_ | Open |

## 3. Risks surfaced by post-market monitoring (Article 9(2)(c))

_TODO: summarise data gathered under the Article 72 post-market monitoring plan. If the system is not yet live, record that and set the first review date._

## 4. Risk management measures (Article 9(2)(d), 9(5))

Article 9(5) requires measures in this order of priority:

1. **Eliminate or reduce risk by design and development.**
${evidenceList(ctx, ['control.confidence.threshold', 'security.prompt-injection'], 'No design-level mitigations were detected in the codebase. TODO: document what exists, or implement them.')}
2. **Mitigate and control risks that cannot be eliminated.**
${evidenceList(ctx, ['control.human.review', 'control.override', 'control.killswitch'], 'No control-level mitigations were detected. TODO: document or implement.')}
3. **Provide information under Article 13 and, where appropriate, training to deployers.**
${evidenceList(ctx, ['transparency.instructions'], 'No instructions for use were detected. See docs/ai-act/instructions-for-use.md.')}

## 5. Residual risk (Article 9(5))

Residual risk must be judged **acceptable** for each individual hazard and **overall**.

- Per-hazard residual risk: _TODO_
- Overall residual risk: _TODO_
- Accepted by: _TODO (named role, not a team)_ on _TODO (date)_

## 6. Testing (Article 9(6)-(8))

Testing is mandatory, against **pre-defined metrics and probabilistic thresholds** appropriate to the intended purpose, at any point during development and **in any event before placing on the market**.

| Metric | Threshold | Measured | Method | Evidence |
|---|---|---|---|---|
| _TODO_ | _TODO_ | _TODO_ | _TODO_ | _TODO_ |

Evidence of a testing harness found in this repository:

${evidenceList(ctx, ['quality.eval.suite', 'quality.test.suite'], 'No evaluation or test suite was detected. This is the single largest gap in demonstrating Article 9(6).')}
`
  );
}

export function dataGovernanceDoc(ctx: EvaluationContext): string {
  return (
    heading(ctx, 'Data and data governance', 'Regulation (EU) 2024/1689, Article 10') +
    `Article 10(2) requires training, validation and testing datasets to be subject to data governance and management practices appropriate for the intended purpose, concerning **at least** the eight points below. Each is answered here.

## (a) Design choices

_TODO: which design choices drove what data you collect and how you represent it?_

## (b) Data collection processes and the origin of the data

_TODO: where does each dataset come from? For personal data, state the **original purpose of collection**._

Datasets and data sources referenced in this repository:

${evidenceList(ctx, ['data.provenance'], 'No dataset documentation was detected in this repository.')}

## (c) Data-preparation operations

_TODO: annotation, labelling, cleaning, updating, enrichment and aggregation. Name the tools and the people._

## (d) Assumptions

_TODO: what is each dataset **supposed to measure and represent**? State this explicitly — Article 10(2)(d) asks for the formulation of assumptions, and unstated assumptions are where discrimination hides._

## (e) Availability, quantity and suitability

_TODO: how much data, and is it enough for the intended purpose?_

## (f) Examination for possible biases

Article 10(2)(f) requires examination in view of biases likely to affect health and safety, negatively impact fundamental rights, or lead to discrimination prohibited under Union law — **especially where outputs influence inputs for future operations**.

Bias or fairness testing found in this repository:

${evidenceList(ctx, ['data.bias.testing'], 'No bias or fairness testing was detected. Article 10(2)(f) is not satisfiable by assertion.')}

Protected or special-category attributes present in the data model:

${evidenceList(ctx, ['data.special-category'], 'No protected attributes were detected in the data model. Note that proxies (postcode, school, name) can encode them without appearing directly.')}

## (g) Measures to detect, prevent and mitigate those biases

_TODO_

## (h) Identification of data gaps or shortcomings

_TODO: what is missing from the data, and how will it be addressed?_

## Article 10(3)-(4) — quality criteria

- **Relevant, sufficiently representative, and to the best extent possible free of errors and complete** in view of the intended purpose: _TODO_
- Appropriate statistical properties, including as regards the persons or groups on whom the system is to be used: _TODO_
- Characteristics particular to the specific **geographical, contextual, behavioural or functional setting**: _TODO_
`
  );
}

export function instructionsForUseDoc(ctx: EvaluationContext): string {
  return (
    heading(ctx, 'Instructions for use', 'Regulation (EU) 2024/1689, Article 13') +
    `Article 13(2) requires instructions for use that are *"concise, complete, correct and clear"*, relevant, accessible and comprehensible to deployers. Article 13(3) sets the minimum contents, reproduced as the sections below.

## (a) Provider identity

- Provider: _TODO (legal name)_
- Registered trade name or trade mark: _TODO_
- Contact address: _TODO_
- Authorised representative in the Union (if the provider is established outside the EU): _TODO_

## (b) Characteristics, capabilities and limitations of performance

### (i) Intended purpose

${ctx.profile.purpose || '_TODO: state the intended purpose precisely. This single sentence determines the risk classification._'}

### (ii) Level of accuracy, robustness and cybersecurity

| Property | Metric | Declared level | How it was validated |
|---|---|---|---|
| Accuracy | _TODO_ | _TODO_ | _TODO_ |
| Robustness | _TODO_ | _TODO_ | _TODO_ |
| Cybersecurity | _TODO_ | _TODO_ | _TODO_ |

Circumstances that may affect these levels: _TODO_

### (iii) Foreseeable misuse leading to Article 9(2) risks

_TODO_

### (iv) Technical capabilities to explain output

${evidenceList(ctx, ['transparency.explanation'], 'No explanation capability was detected in this repository.')}

### (v) Performance regarding specific persons or groups

_TODO: this is where subgroup accuracy goes. "Overall accuracy" alone does not answer Article 13(3)(b)(v)._

### (vi) Input data specifications

_TODO_

### (vii) Information enabling deployers to interpret the output

_TODO_

## (c) Pre-determined changes

_TODO: changes to the system and its performance that were fixed at the time of the initial conformity assessment._

## (d) Human oversight measures (Article 14)

${evidenceList(ctx, ['control.human.review', 'control.override', 'control.killswitch'], 'No human oversight measures were detected in this repository.')}

Technical measures provided to help the deployer interpret outputs: _TODO_

## (e) Computational and hardware resources, expected lifetime, maintenance

_TODO_

## (f) Mechanisms for the deployer to collect, store and interpret the logs

${evidenceList(ctx, ['control.logging.inference'], 'No inference logging was detected — Article 13(3)(f) cannot be answered without it.')}
`
  );
}

export function incidentResponseDoc(ctx: EvaluationContext): string {
  return (
    heading(ctx, 'Serious incident reporting procedure', 'Regulation (EU) 2024/1689, Article 73') +
    `## What counts as a serious incident

An incident or malfunctioning of the AI system that directly or indirectly leads to any of:

1. the **death of a person**, or serious harm to a person's health;
2. a **serious and irreversible disruption** of the management or operation of critical infrastructure;
3. an **infringement of obligations under Union law intended to protect fundamental rights**;
4. **serious harm to property or the environment**.

## Statutory deadlines — Article 73(2)-(4)

| Situation | Deadline | Basis |
|---|---|---|
| Widespread infringement, or a serious incident within Article 3(49)(b) | **Immediately, and not later than 2 days** after becoming aware | Art. 73(3) |
| Death of a person | **Immediately** after establishing (or suspecting) a causal link, and **not later than 10 days** after becoming aware | Art. 73(4) |
| All other serious incidents | Immediately after establishing a causal link or its reasonable likelihood, and **in any event not later than 15 days** after becoming aware | Art. 73(2) |

An **incomplete initial report** may be filed first and completed later (Article 73(5)). Filing late is a breach; filing incomplete is not.

## Who we report to

The **market surveillance authority of the Member State where the incident occurred**.

- Primary contact: _TODO_
- Backup contact: _TODO_

## Procedure

1. **Detect.** Sources: on-call alerting, deployer reports, user complaints, post-market monitoring.
   ${evidenceList(ctx, ['governance.incident-response', 'quality.monitoring'], 'No incident response or monitoring tooling was detected in this repository.')}
2. **Triage** within 24 hours. Assign a severity and decide which deadline above applies. Start the clock from the moment of *awareness*, not the moment of confirmation.
3. **Preserve.** Article 73(6): **do not alter the AI system in a way that may affect the subsequent evaluation of its causes before informing the authorities.** Freeze the model version, the prompt version and the relevant logs.
4. **Report.** File the initial report within the deadline.
5. **Investigate.** Perform the necessary investigations including a risk assessment of the incident and corrective action. Cooperate with the competent authority and the notified body.
6. **Correct.** Article 20: take corrective action immediately; withdraw, disable or recall where needed; inform distributors, deployers, the authorised representative and importers.

## Escalation roster

| Role | Name | Reachable via |
|---|---|---|
| Incident commander | _TODO_ | _TODO_ |
| Regulatory contact | _TODO_ | _TODO_ |
| Data protection officer | _TODO_ | _TODO_ |
`
  );
}

export function postMarketMonitoringDoc(ctx: EvaluationContext): string {
  return (
    heading(ctx, 'Post-market monitoring plan', 'Regulation (EU) 2024/1689, Article 72') +
    `Article 72(3) makes this plan **part of the Annex IV technical documentation**. The Commission's template is not due until 2 September 2027, so this plan is free-form.

## 1. What we collect

Article 72(2) requires active and systematic collection, documentation and analysis of relevant data on performance **throughout the lifetime** of the system.

| Signal | Source | Frequency | Owner |
|---|---|---|---|
| Decision volume by outcome | Inference log | Daily | _TODO_ |
| Human override rate | Inference log | Weekly | _TODO_ |
| Subgroup outcome rates | Inference log + bias harness | Monthly | _TODO_ |
| Model or prompt version changes | Deployment pipeline | Per release | _TODO_ |
| Deployer-reported issues | Support channel | Continuous | _TODO_ |

Monitoring already present in this repository:

${evidenceList(ctx, ['quality.monitoring', 'control.logging.inference'], 'No production monitoring was detected. Without it, Article 72 cannot be evidenced.')}

## 2. Thresholds that trigger action

| Metric | Threshold | Action |
|---|---|---|
| Human override rate | > _TODO_ % | Re-open the Article 9 risk assessment |
| Subgroup impact ratio | < 0.80 | Halt automated application; investigate under Article 10(2)(f) |
| Accuracy | < declared level in the instructions for use | Article 20 corrective action |

> The 0.80 impact-ratio threshold is the four-fifths rule from US EEOC practice (29 C.F.R. § 1607.4(D)). The EU AI Act sets no numeric threshold; adopting a published one makes the plan auditable.

## 3. Interaction with other AI systems

Article 72(2) requires analysis of interaction with other AI systems where relevant.

_TODO: list upstream models, downstream consumers, and what happens when either changes._

## 4. Review cadence

- Plan reviewed: _TODO_
- Next review: _TODO_
- Feeds into: the Article 9 risk management system, section 3.
`
  );
}

export function ciWorkflow(): string {
  return `# Generated by Annex. Keeps the conformity evidence honest on every change.
name: AI Act conformity

on:
  pull_request:
  push:
    branches: [main, master]

permissions:
  contents: read
  security-events: write

jobs:
  annex:
    name: Annex conformity scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # Fails the build if conformity regresses below the floor, and uploads
      # every finding to the Security tab as a code-scanning alert.
      - name: Scan
        run: npx --yes @annex/cli scan . --format sarif --out annex.sarif --fail-under 70

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: annex.sarif
          category: annex

      # Article 43(4): a substantial modification re-opens the conformity
      # assessment. This step compares the current scan to the one on the base
      # branch and comments when the classification or an Article 9-15 control
      # changes.
      - name: Detect substantial modification
        if: github.event_name == 'pull_request'
        run: npx --yes @annex/cli diff --base origin/\${{ github.base_ref }} --head HEAD
`;
}
