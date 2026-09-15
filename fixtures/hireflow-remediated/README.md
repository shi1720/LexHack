# HireFlow

HireFlow helps high-volume recruiting teams get through applications faster.
Upload a job posting, connect your ATS, and HireFlow prioritises applicants by
fit so recruiters spend their time reading rather than sorting.

## Features

- **Resume ranking** — every application gets a fit score against the posting.
- **Review queue** — every below-threshold outcome goes to a named recruiter.
  Nothing is auto-rejected.
- **Structured scorecards** — interviewers score against job-related
  competencies. We removed the affect-inference feature in v3.0; see
  `docs/ai-act/role-determination.md`.
- **Recruiter copilot** — ask questions about any candidate in the pipeline.

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

## AI Act and Local Law 144

HireFlow is the **provider** of a high-risk AI system under Annex III, point
4(a) of Regulation (EU) 2024/1689. Our conformity documentation lives in
`docs/ai-act/`:

| Document | Obligation |
|---|---|
| `role-determination.md` | Articles 3(3) and 25 |
| `risk-management.md` | Article 9 |
| `data-governance.md` | Article 10 |
| `instructions-for-use.md` | Article 13 |
| `incident-reporting.md` | Article 73 |
| `post-market-monitoring.md` | Article 72 |
| `../docs/ai-literacy.md` | Article 4 |

Bias audits follow NYC Local Law 144 (6 RCNY §§ 5-300 to 5-304) and are
published on the careers site. Log retention is 190 days, above the six-month
floor in Article 19(1).

## Limitations

- Not validated for languages other than English.
- Not suitable for promotion, termination or compensation decisions.
- Less accurate on resumes under 200 words and on career changers.
