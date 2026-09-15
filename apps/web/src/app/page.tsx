import Link from 'next/link';
import { ALL_PACKS, CORPUS_SIZE, EU_AI_ACT_PACK, SIGNAL_CATALOGUE } from '@annex/engine';
import { Logo, relativeDays } from '@/components/primitives';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';

const DAY = 86_400_000;

function daysUntil(date: string): number {
  return Math.round((new Date(date).getTime() - Date.now()) / DAY);
}

export default function Landing() {
  const milestones = ALL_PACKS.flatMap((p) => p.milestones.map((m) => ({ ...m, pack: p.name })))
    .map((m) => ({ ...m, days: daysUntil(m.date) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const live = milestones.filter((m) => m.days <= 0);
  const upcoming = milestones.filter((m) => m.days > 0);
  const annexIII = EU_AI_ACT_PACK.milestones.find((m) => m.label.startsWith('Annex III'))!;
  const art50 = EU_AI_ACT_PACK.milestones.find((m) => m.label.startsWith('Article 50'))!;
  const marking = EU_AI_ACT_PACK.milestones.find((m) => m.label.startsWith('Synthetic'))!;

  return (
    <>
      <header className="sticky top-0 z-40 border-b backdrop-blur" style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--paper) 85%, transparent)' }}>
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5">
          <Link href="/" className="no-underline"><Logo /></Link>
          <div className="flex items-center gap-2">
            <a className="btn btn-sm" href="#how">How it works</a>
            <a className="btn btn-sm hidden sm:inline-flex" href="https://github.com/shi1720/LexHack" target="_blank" rel="noreferrer noopener">
              Source
            </a>
            <ThemeToggle />
            <Link className="btn btn-sm btn-primary" href="/login">Open the demo</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
          <p className="eyebrow mb-4">Compliance evidence, compiled from source code</p>
          <h1
            style={{
              fontSize: 'clamp(34px, 6vw, 62px)',
              lineHeight: 1.04,
              letterSpacing: '-0.035em',
              fontWeight: 660,
              margin: 0,
              maxWidth: '16ch',
            }}
          >
            Proof,<br />not paperwork.
          </h1>

          <p className="legal mt-6" style={{ maxWidth: '62ch', fontSize: 19, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
            Every EU AI Act conformity dossier in existence is a document a company wrote about itself.
            Nobody has ever checked one against the system it describes. Annex reads the codebase instead —
            classifies it, tests every obligation against it, and cites a file, a line and a hash for each answer.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link className="btn btn-primary" href="/login" style={{ height: 44, padding: '0 22px', fontSize: 15 }}>
              Scan a repository →
            </Link>
            <a className="btn" href="#clock" style={{ height: 44, padding: '0 20px', fontSize: 15 }}>
              What binds you today
            </a>
          </div>

          <p className="mt-4" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
            One click into a seeded demo. No signup, no credit card, no API key.
          </p>

          {/* Terminal proof */}
          <div className="card mt-12 overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--sunken)' }}>
              <span className="code" style={{ color: 'var(--ink-faint)' }}>~/hireflow</span>
              <span className="code" style={{ color: 'var(--ink-faint)' }}>·</span>
              <span className="code" style={{ color: 'var(--ink-faint)' }}>annex scan .</span>
            </div>
            <pre className="code scroll-x m-0 p-4" style={{ lineHeight: 1.75, fontSize: 12.5 }}>
{`  `}<span style={{ background: 'var(--crimson)', color: 'var(--paper)', fontWeight: 700, padding: '1px 7px', borderRadius: 3 }}>{' PROHIBITED '}</span>{`  Article 5(1)(f) — emotion inference in the workplace

  classification   Annex III, point 4(a) · recruitment and candidate selection    97% confidence
  `}<span style={{ color: 'var(--navy)' }}>src/screening/rank.ts:28</span>{`
    `}<span style={{ color: 'var(--ink-soft)' }}>const decision = candidateScore &gt;= ADVANCE_THRESHOLD ? 'advance' : 'reject';</span>{`

  `}<span style={{ color: 'var(--crimson)' }}>✖ missing</span>{`   Art. 14      Human oversight — no review step, no override, no stop control
  `}<span style={{ color: 'var(--crimson)' }}>✖ missing</span>{`   Art. 12      Record-keeping — nothing records which model made which decision
  `}<span style={{ color: 'var(--crimson)' }}>✖ missing</span>{`   Art. 50(1)   `}<span style={{ color: 'var(--amber)' }}>IN FORCE</span>{`  the chat UI never says it is an AI
  `}<span style={{ color: 'var(--crimson)' }}>✖ missing</span>{`   LL 144 §5-301  no independent bias audit in the last twelve months

  conformity   `}<span style={{ color: 'var(--crimson)' }}>█░░░░░░░░░░░░░░░░░░░░░░░░░░░</span>{`   2/100
  exposure     €294,000   ledger  B43A-D619-8282-7F4D   14 files · 35 ms · no model called`}
            </pre>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="clock" className="border-y" style={{ borderColor: 'var(--line)', background: 'var(--sunken)' }}>
          <div className="mx-auto max-w-6xl px-5 py-14">
            <p className="eyebrow">The thing everyone got wrong in 2026</p>
            <h2 className="mt-3" style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', letterSpacing: '-0.025em', fontWeight: 640, margin: 0, maxWidth: '24ch' }}>
              The deadline moved. The obligations did not.
            </h2>
            <p className="legal mt-5" style={{ maxWidth: '68ch', color: 'var(--ink-soft)', fontSize: 17 }}>
              On 27 July 2026 the Digital Omnibus pushed the Annex&nbsp;III high-risk deadline from August 2026 out to{' '}
              <strong>{annexIII.date}</strong>, and the compliance industry exhaled. It left{' '}
              <strong>Article&nbsp;50 exactly where it was</strong>. If your product talks to a person or generates
              content, you have been in scope since {art50.date} — with €15&nbsp;million or 3&nbsp;% of worldwide
              turnover attached. Machine-readable marking of generated content is due{' '}
              <strong>{marking.date}</strong>, {relativeDays(daysUntil(marking.date))} from now.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="badge badge-bad">In force today</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{live.length} milestones</span>
                </div>
                <ul className="mt-4 space-y-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {live.map((m) => (
                    <li key={`${m.date}-${m.label}`} className="flex gap-3">
                      <span className="code" style={{ color: 'var(--crimson)', minWidth: 78 }}>{m.date}</span>
                      <span>
                        <span style={{ fontWeight: 560 }}>{m.label}</span>
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}> · {m.pack}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="badge badge-neutral">Coming</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{upcoming.length} milestones</span>
                </div>
                <ul className="mt-4 space-y-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {upcoming.map((m) => (
                    <li key={`${m.date}-${m.label}`} className="flex gap-3">
                      <span className="code" style={{ color: 'var(--ink-faint)', minWidth: 78 }}>{m.date}</span>
                      <span>
                        <span style={{ fontWeight: 560 }}>{m.label}</span>
                        <span style={{ color: 'var(--ink-faint)', fontSize: 12.5 }}> · {relativeDays(m.days)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section id="how" className="mx-auto max-w-6xl px-5 py-16">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3" style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', letterSpacing: '-0.025em', fontWeight: 640, margin: 0 }}>
            A regulation is a function over a repository.
          </h2>
          <p className="legal mt-5" style={{ maxWidth: '66ch', color: 'var(--ink-soft)', fontSize: 17 }}>
            Annex compiles statute into executable controls. Each one carries its citation, its own application
            date, a detector that returns evidence, and golden fixtures that fail loudly if the detector drifts.
            No language model participates in any determination.
          </p>

          <ol className="mt-10 grid gap-4 md:grid-cols-3" style={{ listStyle: 'none', padding: 0 }}>
            {[
              {
                n: '01',
                t: 'Read the code',
                d: `${SIGNAL_CATALOGUE.length} detectors extract what the system actually does — which models it calls, whose data it touches, whether a human can override it. Domain signals only fire on source, never on prose: writing about a prohibited practice is not doing one.`,
              },
              {
                n: '02',
                t: 'Apply the law',
                d: `${CORPUS_SIZE} obligations across ${ALL_PACKS.length} jurisdictions run against the evidence. Each returns satisfied, partial or missing — and a "missing" verdict records what was searched for, so a negative finding is auditable too.`,
              },
              {
                n: '03',
                t: 'Produce the artefact',
                d: 'The Annex IV dossier, a CycloneDX attestation, an ML-BOM, SARIF for the Security tab, and a pull request that closes what code can close. Everything is hash-chained so a third party can re-verify it.',
              },
            ].map((step) => (
              <li key={step.n} className="card p-5">
                <div className="code" style={{ color: 'var(--navy)', fontWeight: 700 }}>{step.n}</div>
                <h3 className="mt-2" style={{ fontSize: 16, fontWeight: 620, margin: 0, letterSpacing: '-0.015em' }}>{step.t}</h3>
                <p className="mt-2" style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0 }}>{step.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-y" style={{ borderColor: 'var(--line)' }}>
          <div className="mx-auto max-w-6xl px-5 py-16">
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="eyebrow">What makes it evidence</p>
                <h2 className="mt-3" style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.025em', fontWeight: 640, margin: 0 }}>
                  Anyone can re-run it and get the same answer.
                </h2>
                <p className="legal mt-5" style={{ color: 'var(--ink-soft)', fontSize: 16.5 }}>
                  Every control result is reduced to a canonical line — the control, its status, the rule-pack
                  version and the digest of each cited file — and hashed into a chain. The root goes on the front
                  page of the dossier. Change one character of one cited file and the chain breaks, and{' '}
                  <code className="code">annex verify</code> names the entry that stopped matching.
                </p>
                <p className="legal mt-4" style={{ color: 'var(--ink-soft)', fontSize: 16.5 }}>
                  That is the whole difference between a document and a proof.
                </p>
              </div>

              <div className="card overflow-hidden">
                <div className="border-b px-4 py-2.5" style={{ borderColor: 'var(--line)', background: 'var(--sunken)' }}>
                  <span className="code" style={{ color: 'var(--ink-faint)' }}>annex verify report.json</span>
                </div>
                <pre className="code scroll-x m-0 p-4" style={{ lineHeight: 1.8 }}>
{`  `}<span style={{ background: 'var(--moss)', color: 'var(--paper)', fontWeight: 700, padding: '1px 7px', borderRadius: 3 }}>{' LEDGER INTACT '}</span>{`  0760-ABE2-82CF-F156

  45 entries verified against root 0760abe282cff156…
  algorithm  sha256-chain/v1

  `}<span style={{ color: 'var(--ink-faint)' }}>Re-run the scan on the same commit to confirm
  the evidence itself has not moved.</span>
                </pre>
              </div>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { k: '96.6%', v: 'risk-tier accuracy', d: 'on a 29-case hand-labelled benchmark, half of it carve-outs designed to catch a keyword matcher' },
                { k: '100%', v: 'carve-out precision', d: 'fraud detection, one-to-one identity verification and a blog post about prohibited practices all correctly left alone' },
                { k: '< 50 ms', v: 'to scan a repository', d: 'deterministic and offline; the same commit always produces the same ledger root' },
              ].map((m) => (
                <div key={m.v} className="card p-5">
                  <div style={{ fontSize: 30, fontWeight: 660, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{m.k}</div>
                  <div className="eyebrow mt-1">{m.v}</div>
                  <p className="mt-2" style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: 0 }}>{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="grid gap-10 md:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="eyebrow">What we did not build</p>
              <h2 className="mt-3" style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.025em', fontWeight: 640, margin: 0 }}>
                Not a chatbot that answers questions about the AI Act.
              </h2>
              <p className="legal mt-5" style={{ color: 'var(--ink-soft)', fontSize: 16.5 }}>
                That was the obvious build, and we rejected it. A chatbot cannot tell you whether{' '}
                <em>your</em> system logs inference, and no regulator accepts a language model&rsquo;s opinion as
                evidence. Nor is this a dashboard where you tick boxes about yourself — the AI-governance
                category is already ninety vendors deep in questionnaires.
              </p>
              <p className="legal mt-4" style={{ color: 'var(--ink-soft)', fontSize: 16.5 }}>
                The facts a regulator wants are already in the repository, uncommented. Annex is the compiler
                that reads them.
              </p>
            </div>

            <div className="card overflow-hidden">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ background: 'var(--sunken)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Approach</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 600 }}>Evidence it produces</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Questionnaire platforms', 'What you said about yourself'],
                    ['Consultant readiness sprint', 'A slide deck, once a year'],
                    ['LLM dossier generator', 'Fluent prose nobody verified'],
                    ['Annex', 'A file, a line, a hash — re-checkable'],
                  ].map(([a, b], i, arr) => (
                    <tr key={a} style={{ borderTop: '1px solid var(--line)', background: i === arr.length - 1 ? 'var(--navy-soft)' : undefined }}>
                      <td style={{ padding: '10px 14px', fontWeight: i === arr.length - 1 ? 620 : 450 }}>{a}</td>
                      <td style={{ padding: '10px 14px', color: i === arr.length - 1 ? 'var(--ink)' : 'var(--ink-faint)' }}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        <section className="border-t" style={{ borderColor: 'var(--line)', background: 'var(--sunken)' }}>
          <div className="mx-auto max-w-6xl px-5 py-16 text-center">
            <h2 style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', letterSpacing: '-0.025em', fontWeight: 640, margin: 0 }}>
              Point it at a repository.
            </h2>
            <p className="legal mx-auto mt-4" style={{ maxWidth: '54ch', color: 'var(--ink-soft)', fontSize: 17 }}>
              Four sample codebases are seeded and ready — including one that is illegal in the EU today and the
              same product after the work was done.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link className="btn btn-primary" href="/login" style={{ height: 44, padding: '0 22px', fontSize: 15 }}>
                Open the demo →
              </Link>
              <a className="btn" href="https://github.com/shi1720/LexHack" target="_blank" rel="noreferrer noopener" style={{ height: 44, padding: '0 20px', fontSize: 15 }}>
                Read the source
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo size={16} muted />
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0, maxWidth: '70ch' }}>
            Built by Shivam Gupta for LexHack 2026. Rule packs reconciled against primary sources on{' '}
            {ALL_PACKS[0]?.reconciledOn}. Annex is a technical tool, not legal advice, and not a conformity
            assessment — it is the evidence a competent person needs in order to carry one out.
          </p>
        </div>
      </footer>
    </>
  );
}
