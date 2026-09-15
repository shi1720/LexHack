# What a deployer has to do, and what we do for you

Regulation (EU) 2024/1689, Article 26. These duties fall on **you**, the
employer using HireFlow, not on us. We list them here because Article 13(3)(b)
requires the instructions for use to give you what you need to discharge them.

## Article 26(2) — assigned human oversight

Assign oversight to named natural persons. The Regulation asks for four things
about that person, and only the first is a database field: the necessary
**competence**, the necessary **training**, the necessary **authority** to act
on what they see, and the organisational **support** to exercise it.

HireFlow records the reviewer identifier on every override
(`lib/ai-act/human-oversight.ts`). Whether that person can actually overturn a
rejection is your organisational question, not ours.

## Article 26(4) — input data

You control the job requisition text and the screening criteria. Article 26(4)
makes the representativeness of that input your responsibility so far as you
control it.

## Article 26(6) — log retention

Keep the logs for at least six months. Ours are emitted in the structured
format described in `docs/ai-act/post-market-monitoring.md`; retaining them is
a configuration on your side.

## Article 26(7) — informing workers

**Before** putting HireFlow into service at your workplace, inform workers'
representatives and the affected workers that they will be subject to it. This
is the duty most deployers miss, because it sits outside the technical
requirements and has no engineering task attached to it.

Our staff consultation for internal use was completed on 2026-06-12 with the
works council; the record is held by HR. A template notice for your own
consultation is in `docs/ai-act/templates/worker-notice.md`.
