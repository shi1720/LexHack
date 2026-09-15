# HireFlow

HireFlow helps high-volume recruiting teams get through applications faster.
Upload a job posting, connect your ATS, and HireFlow ranks every applicant by
fit so recruiters spend their time on the shortlist instead of the pile.

## Features

- **Resume ranking** — every application gets a fit score against the posting.
- **Auto-advance** — applicants above the threshold move straight to interview.
- **Interview Signal** — analyses recorded video interviews for engagement.
- **Recruiter copilot** — ask questions about any candidate in the pipeline.

## Running locally

```bash
npm install
cp .env.example .env
npm run dev
```

## Architecture

Next.js App Router, Postgres via Prisma, OpenAI for scoring and the copilot.
