# LendWise

Credit decisioning for consumer lenders. LendWise scores applications, returns a
probability of default and an affordability assessment, and hands borderline
cases to an underwriter.

## Pipeline

1. Application arrives via the API.
2. Features are built from the applicant record and bureau data.
3. The gradient-boosted model returns a probability of default.
4. Decisions above the review band go to a human underwriter.

## Fairness

We run `evals/fairness.py` on every model release and publish the selection
rates by protected group to the model registry.
