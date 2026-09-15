import type { ScanReport } from '../types.js';
import type { Dossier } from './annex-iv.js';

const LABELS = {
  en: {
    issued: 'Issued',
    system: 'System',
    provider: 'Provider',
    version: 'Version under assessment',
    classification: 'Classification',
    role: 'Role under Article 3',
    fingerprint: 'Evidence ledger',
    method: 'Statement of method',
    evidence: 'Evidence',
    open: 'Open items — determinations this document cannot make',
    appendix: 'Appendix A — Control register',
    ledgerAppendix: 'Appendix B — Evidence ledger',
    control: 'Control',
    status: 'Status',
    citation: 'Citation',
    finding: 'Finding',
    contents: 'Contents',
  },
  de: {
    issued: 'Ausgestellt',
    system: 'System',
    provider: 'Anbieter',
    version: 'Bewertete Version',
    classification: 'Einstufung',
    role: 'Rolle nach Artikel 3',
    fingerprint: 'Nachweisregister',
    method: 'Methodenerklärung',
    evidence: 'Nachweise',
    open: 'Offene Punkte — Feststellungen, die dieses Dokument nicht treffen kann',
    appendix: 'Anhang A — Kontrollregister',
    ledgerAppendix: 'Anhang B — Nachweisregister',
    control: 'Kontrolle',
    status: 'Status',
    citation: 'Fundstelle',
    finding: 'Feststellung',
    contents: 'Inhalt',
  },
  fr: {
    issued: 'Délivré',
    system: 'Système',
    provider: 'Fournisseur',
    version: 'Version évaluée',
    classification: 'Classification',
    role: "Rôle au titre de l'article 3",
    fingerprint: 'Registre de preuves',
    method: 'Déclaration de méthode',
    evidence: 'Preuves',
    open: 'Points ouverts — déterminations que ce document ne peut pas établir',
    appendix: 'Annexe A — Registre des contrôles',
    ledgerAppendix: 'Annexe B — Registre de preuves',
    control: 'Contrôle',
    status: 'Statut',
    citation: 'Référence',
    finding: 'Constat',
    contents: 'Sommaire',
  },
} as const;

const METHOD_STATEMENT = `This document was compiled by Annex directly from the source code of the system it describes, at the commit identified above. Every statement below falls into one of three categories, and they are never mixed:

1. **Evidenced.** The statement is supported by one or more citations to a file and a line in the repository. Each citation carries the SHA-256 digest of the file it came from, recorded in Appendix B.
2. **No evidence found.** The engine searched the whole snapshot and found nothing supporting the statement. The negative finding is recorded rather than omitted.
3. **Open.** The determination requires a judgement that cannot be derived from source code — a residual-risk acceptance, a declared accuracy level, an accountable person. These are listed per section and summarised on the front page. They are left blank deliberately: a generated document that invents them would be a false statement to a competent authority, which Article 99(5) prices at EUR 7 500 000 or 1 % of worldwide annual turnover.

No language model participated in any determination in this document. Classification and control evaluation are rule-based, deterministic and offline; the same commit always produces the same evidence ledger root. Where a language model contributed narrative prose, the section says so.

This document is a technical artefact, not legal advice, and it is not a conformity assessment. It is the input a competent person needs in order to carry one out, and the means by which a third party can check that its claims are true.`;

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

export function dossierToMarkdown(dossier: Dossier, report: ScanReport): string {
  const t = LABELS[dossier.locale];
  const lines: string[] = [];

  lines.push(`# ${dossier.title}`, '');
  lines.push(`> Regulation (EU) 2024/1689, Annex IV${dossier.simplified ? ' — simplified form (Article 11(1), third subparagraph)' : ''}`, '');
  lines.push(
    '| | |',
    '|---|---|',
    `| **${t.system}** | ${dossier.systemName} |`,
    `| **${t.provider}** | ${dossier.provider} |`,
    `| **${t.version}** | \`${dossier.version}\` |`,
    `| **${t.issued}** | ${dossier.issuedAt.slice(0, 10)} |`,
    `| **${t.classification}** | ${dossier.classification} |`,
    `| **${t.role}** | ${dossier.role.replace('+', ' and ')} |`,
    `| **${t.fingerprint}** | \`${dossier.ledgerFingerprint}\` |`,
    `| **Open items** | ${dossier.openCount} |`,
    `| **Evidence citations** | ${dossier.evidenceCount} |`,
    '',
  );

  lines.push(`## ${t.method}`, '', METHOD_STATEMENT, '');

  for (const section of dossier.sections) {
    lines.push(`## ${section.point}. ${section.title}`, '');
    for (const p of section.body) lines.push(p, '');
    if (section.evidence.length > 0) {
      lines.push(`**${t.evidence}**`, '');
      for (const e of section.evidence) lines.push(`- \`${e.path}:${e.line}\` — \`${e.snippet}\``);
      lines.push('');
    }
    if (section.open.length > 0) {
      lines.push(`**${t.open}**`, '');
      for (const o of section.open) lines.push(`- [ ] ${o}`);
      lines.push('');
    }
  }

  lines.push(`## ${t.appendix}`, '');
  lines.push(`| ${t.control} | ${t.citation} | ${t.status} | ${t.finding} |`, '|---|---|---|---|');
  for (const control of report.controls) {
    if (control.status === 'not_applicable') continue;
    const cite = control.citations[0];
    lines.push(
      `| ${control.title} | ${cite ? `${cite.short} ${cite.locator}` : control.controlId} | ${control.status} | ${control.finding.replace(/\|/g, '\\|').slice(0, 220)} |`,
    );
  }
  lines.push('');

  lines.push(`## ${t.ledgerAppendix}`, '');
  lines.push(
    `Algorithm: \`${report.ledger.algorithm}\`. Root: \`${report.ledger.root}\`.`,
    '',
    'Each entry hashes the previous entry, the control identifier, its status and score, the rule-pack version, and the digest of every piece of evidence cited. Re-running Annex on the same commit reproduces this root exactly. If a cited file changes by one character, the chain breaks and `annex verify` names the entry that stopped matching.',
    '',
    '| # | Control | Status | Entry hash |',
    '|---|---|---|---|',
  );
  for (const entry of report.ledger.entries) {
    lines.push(`| ${entry.index} | ${entry.controlId} | ${entry.status} | \`${entry.hash.slice(0, 16)}\` |`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// HTML — print-ready, A4, no external assets
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Minimal inline markdown: **bold**, `code`. Everything else is escaped. */
function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

const STATUS_CLASS: Record<string, string> = {
  satisfied: 'ok',
  partial: 'warn',
  needs_review: 'warn',
  missing: 'bad',
  not_applicable: 'na',
};

function renderMethod(): string {
  return METHOD_STATEMENT.split('\n\n')
    .map((block) => {
      const items = block.split('\n').filter((l) => /^\d+\.\s/.test(l));
      if (items.length > 1) {
        return `<ol class="method-list">${items.map((i) => `<li>${inline(i.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>`;
      }
      return `<p>${inline(block)}</p>`;
    })
    .join('');
}

export function dossierToHtml(dossier: Dossier, report: ScanReport): string {
  const t = LABELS[dossier.locale];
  const applicable = report.controls.filter((c) => c.status !== 'not_applicable');

  const toc = dossier.sections
    .map((s) => `<li><a href="#p${s.point}">${esc(s.title)}</a></li>`)
    .join('');

  const body = dossier.sections
    .map(
      (s) => `
<section class="pt" id="p${s.point}">
  <h2><span class="num">${s.point}</span>${esc(s.title)}</h2>
  ${s.body.map((p) => `<p>${inline(p)}</p>`).join('\n')}
  ${
    s.evidence.length
      ? `<div class="ev"><h3>${t.evidence}</h3><ul>${s.evidence
          .map((e) => `<li><span class="loc">${esc(e.path)}:${e.line}</span><code>${esc(e.snippet)}</code></li>`)
          .join('')}</ul></div>`
      : ''
  }
  ${
    s.open.length
      ? `<div class="open"><h3>${t.open}</h3><ul>${s.open.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>`
      : ''
  }
</section>`,
    )
    .join('\n');

  const register = applicable
    .map((c) => {
      const cite = c.citations[0];
      return `<tr>
      <td>${esc(c.title)}</td>
      <td class="cite">${cite ? esc(`${cite.short} ${cite.locator}`) : esc(c.controlId)}</td>
      <td><span class="badge ${STATUS_CLASS[c.status] ?? 'na'}">${c.status.replace('_', ' ')}</span></td>
      <td>${esc(c.finding)}</td>
    </tr>`;
    })
    .join('');

  const ledgerRows = report.ledger.entries
    .map(
      (e) =>
        `<tr><td>${e.index}</td><td class="cite">${esc(e.controlId)}</td><td>${e.status.replace('_', ' ')}</td><td><code>${e.hash.slice(0, 20)}</code></td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${dossier.locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(dossier.systemName)} — ${esc(dossier.title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  :root {
    --ink: #14181f; --muted: #5b6572; --line: #dde2e8; --paper: #ffffff;
    --accent: #1b3a6b; --ok: #0f6b45; --warn: #8a5a00; --bad: #a11526; --na: #6b7280;
    --serif: 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Source Serif Pro', Georgia, serif;
    --sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: #eef1f4; color: var(--ink); font-family: var(--serif); font-size: 10.5pt; line-height: 1.6; }
  .sheet { max-width: 210mm; margin: 0 auto; background: var(--paper); padding: 22mm 18mm; }
  @media screen and (max-width: 820px) { .sheet { padding: 20px 16px; } }
  @media print { body { background: #fff; } .sheet { max-width: none; margin: 0; padding: 0; } }

  h1 { font-size: 22pt; line-height: 1.25; margin: 0 0 6px; letter-spacing: -0.01em; }
  .sub { font-family: var(--sans); font-size: 9pt; color: var(--muted); margin: 0 0 28px; }
  h2 { font-family: var(--sans); font-size: 12.5pt; margin: 30px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--line); letter-spacing: -0.01em; }
  h2 .num { display: inline-block; min-width: 26px; color: var(--accent); font-variant-numeric: tabular-nums; }
  h3 { font-family: var(--sans); font-size: 9pt; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin: 16px 0 8px; }
  p { margin: 0 0 11px; }
  code { font-family: var(--mono); font-size: 8.8pt; background: #f4f6f8; padding: 1px 4px; border-radius: 3px; word-break: break-word; }

  .meta { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 9.5pt; margin-bottom: 26px; }
  .meta th { text-align: left; width: 38%; padding: 7px 10px 7px 0; color: var(--muted); font-weight: 500; vertical-align: top; border-bottom: 1px solid var(--line); }
  .meta td { padding: 7px 0; border-bottom: 1px solid var(--line); vertical-align: top; }

  .fingerprint { font-family: var(--mono); font-size: 10pt; letter-spacing: 0.06em; }

  .toc { font-family: var(--sans); font-size: 9.5pt; background: #f7f9fb; border: 1px solid var(--line); border-radius: 6px; padding: 14px 18px; margin-bottom: 26px; }
  .toc h3 { margin-top: 0; }
  .toc ol { margin: 0; padding-left: 18px; }
  .toc li { margin: 3px 0; }
  .toc a { color: var(--accent); text-decoration: none; }

  .method { background: #f7f9fb; border-left: 3px solid var(--accent); padding: 14px 18px; margin-bottom: 8px; font-size: 10pt; }
  .method-list { margin: 0 0 11px; padding-left: 20px; }
  .method-list li { margin-bottom: 7px; }

  .pt { break-inside: avoid-page; }
  .ev { background: #f7f9fb; border: 1px solid var(--line); border-radius: 6px; padding: 12px 16px; margin: 14px 0; }
  .ev ul, .open ul { list-style: none; margin: 0; padding: 0; }
  .ev li { padding: 5px 0; border-bottom: 1px dotted var(--line); font-size: 9pt; }
  .ev li:last-child { border-bottom: 0; }
  .loc { display: block; font-family: var(--mono); font-size: 8.2pt; color: var(--accent); }
  .open { border: 1px solid #e8cf9a; background: #fdf8ec; border-radius: 6px; padding: 12px 16px; margin: 14px 0; }
  .open li { font-family: var(--sans); font-size: 9.2pt; padding: 3px 0 3px 20px; position: relative; }
  .open li::before { content: '☐'; position: absolute; left: 0; color: var(--warn); }

  table.reg { width: 100%; border-collapse: collapse; font-family: var(--sans); font-size: 8.6pt; margin-top: 10px; }
  table.reg th { text-align: left; background: #f4f6f8; padding: 7px 8px; border-bottom: 2px solid var(--line); font-weight: 600; }
  table.reg td { padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.reg .cite { font-family: var(--mono); font-size: 8pt; white-space: nowrap; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 7.6pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  .badge.ok { background: #e3f3ec; color: var(--ok); }
  .badge.warn { background: #fbf0dc; color: var(--warn); }
  .badge.bad { background: #fbe6e9; color: var(--bad); }
  .badge.na { background: #eef0f2; color: var(--na); }

  footer { margin-top: 34px; padding-top: 12px; border-top: 1px solid var(--line); font-family: var(--sans); font-size: 8pt; color: var(--muted); }
  .scroll { overflow-x: auto; }
</style>
</head>
<body>
<div class="sheet">
  <h1>${esc(dossier.title)}</h1>
  <p class="sub">Regulation (EU) 2024/1689, Annex IV${dossier.simplified ? ' — simplified form under Article 11(1)' : ''} · compiled from source by Annex</p>

  <table class="meta">
    <tr><th>${t.system}</th><td>${esc(dossier.systemName)}</td></tr>
    <tr><th>${t.provider}</th><td>${esc(dossier.provider)}</td></tr>
    <tr><th>${t.version}</th><td><code>${esc(dossier.version)}</code></td></tr>
    <tr><th>${t.issued}</th><td>${dossier.issuedAt.slice(0, 10)}</td></tr>
    <tr><th>${t.classification}</th><td>${esc(dossier.classification)}</td></tr>
    <tr><th>${t.role}</th><td>${esc(dossier.role.replace('+', ' and '))}</td></tr>
    <tr><th>${t.fingerprint}</th><td class="fingerprint">${esc(dossier.ledgerFingerprint)}</td></tr>
    <tr><th>Evidence citations</th><td>${dossier.evidenceCount}</td></tr>
    <tr><th>Open items</th><td>${dossier.openCount}</td></tr>
  </table>

  <nav class="toc"><h3>${t.contents}</h3><ol>${toc}</ol></nav>

  <h2><span class="num">§</span>${t.method}</h2>
  <div class="method">${renderMethod()}</div>

  ${body}

  <h2><span class="num">A</span>${t.appendix}</h2>
  <div class="scroll">
  <table class="reg">
    <thead><tr><th>${t.control}</th><th>${t.citation}</th><th>${t.status}</th><th>${t.finding}</th></tr></thead>
    <tbody>${register}</tbody>
  </table>
  </div>

  <h2><span class="num">B</span>${t.ledgerAppendix}</h2>
  <p>Algorithm <code>${report.ledger.algorithm}</code>. Root <code>${report.ledger.root}</code>.</p>
  <p>Each entry hashes the previous entry, the control identifier, its status and score, the rule-pack version, and the digest of every piece of evidence cited. Re-running Annex on the same commit reproduces this root exactly. If a cited file changes by one character, the chain breaks and <code>annex verify</code> names the entry that stopped matching.</p>
  <div class="scroll">
  <table class="reg">
    <thead><tr><th>#</th><th>${t.control}</th><th>${t.status}</th><th>Entry hash</th></tr></thead>
    <tbody>${ledgerRows}</tbody>
  </table>
  </div>

  <footer>
    Compiled by Annex ${report.engineVersion} on ${report.createdAt.slice(0, 10)} from ${report.snapshot.fileCount} source files in ${report.durationMs} ms.
    Rule packs: ${report.packs.map((p) => `${p.packName} ${p.version}`).join(' · ')}.
    This is a technical artefact, not legal advice, and not a conformity assessment.
  </footer>
</div>
</body>
</html>`;
}
