# Risk management system

> **System:** HireFlow candidate screening
> **Legal basis:** Regulation (EU) 2024/1689, Article 9
> **Owner:** VP Engineering (accountable), Head of Talent (business owner)
> **Last reviewed:** 2026-09-02 · **Next review:** 2027-03-02

## 1. Scope and lifecycle

Continuous and iterative across the lifecycle. Reviewed on every substantial
modification, on every serious incident, and at minimum every six months.

## 2. Identified risks

| # | Risk | Source | Likelihood | Severity | Residual |
|---|---|---|---|---|---|
| R1 | Screening disadvantages a protected group through a proxy feature | Annex III 4(a) | Medium | High | Accepted — impact ratio monitored weekly, floor 0.80 |
| R2 | Recruiter defers to the score rather than assessing it (automation bias) | Art. 14(4)(b) | High | Medium | Accepted — reason codes shown, score hidden until the recruiter records a view |
| R3 | Model output drifts after a posting-template change | Art. 15(4) | Medium | Medium | Accepted — weekly golden-set run, alert below 0.82 |
| R4 | Candidate cannot understand or contest an outcome | GDPR Art. 22(3) | Low | High | Accepted — appeal route with 30-day SLA |

## 3. Risks from post-market monitoring

Q2 2026 monitoring showed the override rate rising to 19% on one requisition
template. Root cause was an over-specified posting, not the model. Template
guidance updated; override rate returned to 7%.

## 4. Measures, in the Article 9(5) order

1. **Eliminate by design.** The affect-inference interview feature was removed in
   v3.0 rather than mitigated: Article 5(1)(f) prohibits it outright in a
   recruitment context. Protected attributes and their known proxies are
   excluded from the prompt.
2. **Mitigate and control.** Human oversight gate (`lib/ai-act/human-oversight.ts`),
   reason codes, override path, stop control.
3. **Inform.** Instructions for use published to deployers; candidate notice
   published on the careers site.

## 5. Residual risk

Per-hazard and overall residual risk judged **acceptable** by the VP Engineering
on 2026-09-02, on the basis of the Q2 monitoring data and the current bias audit.

## 6. Testing

| Metric | Threshold | Measured | Method |
|---|---|---|---|
| Agreement with human label | ≥ 0.82 | 0.86 | `evals/accuracy.ts`, 420-case frozen set |
| Impact ratio, every category | ≥ 0.80 | 0.88 (lowest) | `evals/bias-audit.ts` |
| Override rate | ≤ 12% | 7% | Production audit log |
