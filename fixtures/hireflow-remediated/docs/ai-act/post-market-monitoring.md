# Post-market monitoring plan

Regulation (EU) 2024/1689, Article 72. Part of the Annex IV technical
documentation by virtue of Article 72(3).

## Signals

| Signal | Source | Frequency | Owner |
|---|---|---|---|
| Decisions by outcome | Audit log | Daily | Platform |
| Human override rate | Audit log | Weekly | Head of Talent |
| Impact ratio by EEO-1 category | `evals/bias-audit.ts` | Weekly | ML lead |
| Agreement with human label | `evals/accuracy.ts` | Per release | ML lead |
| Deployer-reported issues | Support | Continuous | Support lead |

## Thresholds

| Metric | Threshold | Action |
|---|---|---|
| Impact ratio | < 0.80 | Halt automated prioritisation; re-open Article 9 assessment |
| Agreement with human label | < 0.82 | Article 20 corrective action |
| Override rate | > 12% | Investigate posting templates and prompt |

## Review

Reviewed quarterly. Feeds section 3 of the risk management system.
