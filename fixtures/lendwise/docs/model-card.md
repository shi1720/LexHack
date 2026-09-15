# Model card — pd-v4.2.1

## Intended use

Estimates the probability that a consumer loan application will default within
24 months. Used to triage applications into approve, decline and underwriter
review bands.

## Training data

Internal originations from 2019-2025 joined to bureau records. 1.4M rows.
Source and licence: internal, covered by the customer data agreement.

## Limitations

- Trained on UK and Irish originations only; performance outside those markets
  is unvalidated.
- Thin-file applicants (< 12 months bureau history) are under-represented.

## Metrics

ROC AUC 0.81 on the frozen 2026Q1 validation set.
