#!/usr/bin/env bash
# Prerequisites: authenticated gcloud/firebase CLIs, Firebase site, runtime identity,
# build identity and a Secret Manager secret. See docs/DEPLOY.md.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT_ID="${PROJECT_ID:-epilogue-508616}"
REGION="${REGION:-us-central1}"
npm ci
npm run test:run
npm run build
npm run typecheck
npm run check:counts
npm run attack
gcloud run deploy annex --source=. --project="$PROJECT_ID" --region="$REGION" \
 --build-service-account="projects/$PROJECT_ID/serviceAccounts/plotline-build@$PROJECT_ID.iam.gserviceaccount.com" \
 --service-account="annex-runtime@$PROJECT_ID.iam.gserviceaccount.com" \
 --update-secrets=OPENAI_API_KEY=annex-openai:latest \
 --update-env-vars=ANNEX_PUBLIC_DEMO=1,ANNEX_ORIGIN=https://annex-evidence.web.app \
 --max-instances=1 --concurrency=8 --memory=1Gi --cpu=1 --timeout=60 --quiet
firebase deploy --only hosting --project="$PROJECT_ID" --non-interactive
node scripts/api-check.mjs https://annex-evidence.web.app
