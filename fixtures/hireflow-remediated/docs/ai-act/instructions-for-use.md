# Instructions for use

Regulation (EU) 2024/1689, Article 13(3).

## (a) Provider

HireFlow B.V., Keizersgracht 1, Amsterdam. compliance@hireflow.example.

## (b) Characteristics, capabilities and limitations

### (i) Intended purpose

Rank job applicants against a specific posting to help a recruiter prioritise
review. The system produces a **recommendation**, never a final rejection.

### (ii) Declared accuracy

| Property | Metric | Declared level | Validation |
|---|---|---|---|
| Accuracy | Agreement with human recruiter label | **0.86** | 420-case frozen set, `evals/accuracy.ts` |
| Robustness | Score stability under resume reformatting | ±0.04 | Perturbation suite |
| Cybersecurity | Prompt-injection resistance | 0 successful injections in 240 adversarial cases | `evals/adversarial.ts` |

Accuracy degrades on: resumes under 200 words, non-English resumes, and career
paths with more than three industry changes.

### (iii) Foreseeable misuse

Using the fit score as an automatic rejection is outside the intended purpose
and is blocked by the oversight gate. Repurposing the model for promotion or
termination decisions is a change of intended purpose under Article 25(1)(c).

### (iv) Explanation capability

Every score is returned with reason codes (`src/screening/explain.ts`).

### (v) Performance for specific groups

Agreement with the human label by group, 2026Q2 audit: lowest 0.83 (two or more
races), highest 0.89. Impact ratio floor 0.88 across all EEO-1 categories.

### (vi) Input data specification

Plain-text resume, 200-4,000 words, plus the posting description.

### (vii) Interpreting the output

A score is a prioritisation signal, not a verdict. Recruiters must record a view
before the score is revealed.

## (c) Pre-determined changes

Prompt version updates within the same template family. Any change to the scored
attributes re-opens the conformity assessment.

## (d) Human oversight measures

Adverse outcomes are never auto-applied. `AI_ENABLED=false` halts scoring in a
safe state. Reviewers can override any outcome with a recorded reason.

## (e) Resources, lifetime and maintenance

Hosted service. Model and prompt versions reviewed quarterly.

## (f) Reading the logs

`GET /api/decisions/:decisionId` returns the full record. Logs are retained for
190 days (`LOG_RETENTION_DAYS`), above the six-month floor in Article 19(1).

## Limitations

- Not validated for languages other than English.
- Not suitable for promotion, termination or compensation decisions.
- Not a substitute for a structured interview.
