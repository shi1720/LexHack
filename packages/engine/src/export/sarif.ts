import type { ControlResult, ScanReport, Severity } from '../types.js';
import { ENGINE_VERSION } from '../scan.js';

/**
 * SARIF 2.1.0 output.
 *
 * This is the format GitHub's code scanning ingests, so a conformity gap shows
 * up as an annotation on the exact line of the pull request that caused it —
 * next to the security findings, in the workflow engineers already have. A
 * compliance finding that lives in a PDF gets read once a year; one that lives
 * in a diff gets fixed the same afternoon.
 */

const SARIF_LEVEL: Record<Severity, 'error' | 'warning' | 'note'> = {
  critical: 'error',
  high: 'error',
  medium: 'warning',
  low: 'note',
};

const SECURITY_SEVERITY: Record<Severity, string> = {
  critical: '9.5',
  high: '7.5',
  medium: '5.0',
  low: '2.0',
};

export function toSarif(report: ScanReport): string {
  const failing = report.controls.filter(
    (c) => c.status === 'missing' || c.status === 'partial' || c.status === 'needs_review',
  );

  const rules = failing.map((c) => ({
    id: c.controlId,
    name: c.controlId.split('.').map(pascal).join(''),
    shortDescription: { text: c.title },
    fullDescription: { text: c.obligation },
    help: {
      text: `${c.obligation}\n\n${c.gap ?? ''}\n\n${c.citations.map((ct) => `${ct.short} ${ct.locator} — ${ct.title}: ${ct.url}`).join('\n')}`,
      markdown: [
        `**${c.title}**`,
        '',
        c.obligation,
        '',
        c.gap ? `**How to close it:** ${c.gap}` : '',
        '',
        '**Citations**',
        ...c.citations.map((ct) => `- [${ct.short} ${ct.locator} — ${ct.title}](${ct.url})`),
        '',
        `_In force from ${c.appliesFrom}._`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    defaultConfiguration: { level: SARIF_LEVEL[c.severity] },
    properties: {
      tags: ['compliance', c.pack, c.family, c.inForce ? 'in-force' : 'upcoming'],
      'security-severity': SECURITY_SEVERITY[c.severity],
      precision: 'high',
    },
  }));

  const results = failing.flatMap((c) => toResults(c));

  return JSON.stringify(
    {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'Annex',
              fullName: 'Annex — AI Act conformity engine',
              version: ENGINE_VERSION,
              semanticVersion: ENGINE_VERSION,
              informationUri: 'https://github.com/shi1720/LexHack',
              rules: dedupeById(rules),
            },
          },
          automationDetails: {
            id: `annex/${report.id}`,
            description: { text: report.classification.summary },
          },
          invocations: [
            {
              executionSuccessful: true,
              endTimeUtc: report.createdAt,
              properties: {
                conformityScore: report.score,
                liveScore: report.liveScore,
                riskTier: report.classification.tier,
                ledgerRoot: report.ledger.root,
              },
            },
          ],
          results,
        },
      ],
    },
    null,
    2,
  );
}

function toResults(control: ControlResult) {
  const locations = control.evidence
    .filter((e) => e.kind !== 'absence' && e.path && !e.path.startsWith('('))
    .slice(0, 5)
    .map((e) => ({
      physicalLocation: {
        artifactLocation: { uri: e.path },
        region: {
          startLine: Math.max(1, e.line),
          ...(e.endLine ? { endLine: e.endLine } : {}),
          snippet: { text: e.snippet },
        },
      },
    }));

  // A missing obligation has no line to point at. SARIF requires a location,
  // so anchor it on the repository root rather than dropping the finding.
  const anchored = locations.length > 0
    ? locations
    : [{ physicalLocation: { artifactLocation: { uri: 'README.md' }, region: { startLine: 1 } } }];

  return [
    {
      ruleId: control.controlId,
      level: SARIF_LEVEL[control.severity],
      message: {
        text: `${control.title}: ${control.finding}${control.gap ? ` ${control.gap}` : ''}`,
      },
      locations: anchored,
      partialFingerprints: { annexControl: control.controlId },
      properties: {
        pack: control.pack,
        status: control.status,
        appliesFrom: control.appliesFrom,
        inForce: control.inForce,
        citation: control.citations[0] ? `${control.citations[0].short} ${control.citations[0].locator}` : undefined,
      },
    },
  ];
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

function pascal(s: string): string {
  return s.replace(/(^|[-_])(\w)/g, (_m, _p, ch: string) => ch.toUpperCase());
}
