# Data and data governance

Regulation (EU) 2024/1689, Article 10.

## (a) Design choices

Only job-related features reach the model: resume text and posting text. Name,
photograph, address and date of birth are stripped before the prompt is built.

## (b) Data collection and origin

Training data source: 38,000 historical applications from consenting customer
tenants, 2023-2025. Original purpose of collection: recruitment. Retention under
the customer data processing agreement.

## (c) Data preparation

Resumes normalised to plain text, PII stripped by `src/db/redact.ts`, labels
assigned by two independent recruiters with adjudication on disagreement.

## (d) Assumptions

The historical recruiter label is assumed to approximate "would be a strong
hire". This assumption carries any bias the historical recruiters had, which is
why (f) below is run on every release rather than once.

## (e) Availability, quantity and suitability

38,000 labelled applications across 14 job families. Under-represented: roles
with fewer than 50 historical applications, flagged in the model card.

## (f) Examination for possible biases

`evals/bias-audit.ts` computes selection rates and impact ratios per EEO-1
category and for intersectional sex x ethnicity x race categories, on every
release. 2026Q2 result: impact ratio floor 0.88.

## (g) Bias mitigation

Protected attributes and known proxies excluded from features; the system prompt
instructs the model not to consider them; outputs re-audited after every prompt
change.

## (h) Data gaps

Non-English resumes and career-changer profiles are under-represented. Collection
is in progress; until then the model card records the limitation.
