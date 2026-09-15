# Contributing

The most useful contribution is a **rule pack control** or a **benchmark case**,
because both are the kind of work that does not scale by being clever.

## Setup

```bash
npm install && npm run build
npm run test:run      # 126 tests
npm run benchmark     # 42 labelled cases, with the failures printed
npm run dev           # the web app on :3000
```

Node 22+. There is no other prerequisite: the engine has zero runtime
dependencies and the database is a file.

## Adding a control

A control is a function over a repository that returns a status and the evidence
for it. Live in `packages/engine/src/packs/`, and carry:

- **A citation to the operative text**, with a quote where it is short enough to
  quote. Not a summary of the article — the article.
- **Its own `appliesFrom` date.** For the EU AI Act, `test/dates.spec.ts` checks
  it against a written-down Article 113 table, and a control whose article is
  not in that table fails rather than being skipped.
- **Golden fixtures.** At least one case that must come back `missing` and one
  that must come back `satisfied`, as minimal virtual repositories. This is the
  bar: a detector with no fixture is a detector nobody can refactor safely.
- **A `gap` that tells somebody what to do**, in the language of the statute.

Run `node packages/cli/dist/bin.js explain <control-id>` to see the shape.

## Adding a benchmark case

`packages/engine/src/benchmark/corpus.ts`. A case is a miniature repository, the
tier a competent reader of the Act would assign, and **the reason**. The reason
is not decoration: it is printed in the report and it is how a stranger checks
your label rather than trusting it.

**Carve-outs are worth more than violations.** Roughly half the corpus exists to
catch false positives, because over-classification is how a compliance tool
loses an engineering team. A case that a keyword matcher would get wrong is the
most valuable thing you can add.

If your case fails, that is a result. Do not tune the label to the engine.

## House rules

- **The engine calls no model and makes no network request during analysis.** If
  a change needs either, it belongs in the CLI or the web app, not the engine.
- **The engine has zero runtime dependencies.** A compliance tool that pulls in
  forty transitive packages to read a `.tar.gz` is making an argument against
  itself.
- **Determinism.** The same commit must produce the same ledger root. No
  `Date.now()` in a code path that reaches a hash, no iteration order that
  depends on a `Set` built from file order.
- **Evidence or nothing.** A control may not report `satisfied` without citing a
  file and a line, and may not report `missing` without recording what it
  searched for.
- **Say what you cannot do.** `needs_review` exists for determinations that
  depend on facts a repository does not contain. Use it rather than guessing.

## Before you open a pull request

```bash
npm run typecheck && npm run test:run && npm run benchmark && npm run build
node scripts/audit.mjs        # accessibility and responsive, against a running app
npm run selfscan              # Annex scans Annex; it should stay at 100/100
```

CI runs all of these plus a dogfood scan that uploads SARIF.
