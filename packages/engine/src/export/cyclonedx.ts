import type { ControlResult, RulePack, ScanReport } from '../types.js';
import { ENGINE_VERSION } from '../scan.js';
import { sha256 } from '../util/hash.js';

/**
 * CycloneDX output.
 *
 * Two documents, both standardised, both machine-readable:
 *
 *  - an **attestation** (CycloneDX Attestations, standardised as ECMA-424),
 *    which expresses exactly the shape Annex produces — standard, requirement,
 *    claim, evidence, conformance — including non-conformance and counter-
 *    evidence. It exists so producers, assessors and regulators can exchange
 *    assurance without inventing a format each time. Annex does not invent one.
 *
 *  - an **ML-BOM**, the inventory of models and services the system depends on.
 *    NIST AI RMF GOVERN 1.6 asks for an inventory; this is it, generated rather
 *    than hand-maintained.
 */

const BOM_FORMAT = 'CycloneDX';
const SPEC_VERSION = '1.6';
/**
 * The document says which schema it is, so a validator does not have to be
 * told. `cyclonedx validate` and Dependency-Track both infer it from
 * `specVersion`, but a reviewer who opens the file in an editor gets
 * completion and inline errors for free, and a generic JSON validator gets a
 * document it can check at all.
 */
const SCHEMA = `http://cyclonedx.org/schema/bom-${SPEC_VERSION}.schema.json`;

function urn(seed: string): string {
  const h = sha256(seed);
  return `urn:uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function conformance(control: ControlResult): number {
  switch (control.status) {
    case 'satisfied':
    case 'not_applicable':
      return 1;
    case 'partial':
      return 0.5;
    case 'needs_review':
      return 0.35;
    default:
      return 0;
  }
}

export function toAttestation(report: ScanReport, packs: RulePack[]): string {
  const byPack = new Map(packs.map((p) => [p.id, p]));
  const applicable = report.controls.filter((r) => r.status !== 'not_applicable');

  const standards = packs
    .filter((p) => applicable.some((r) => r.pack === p.id))
    .map((p) => ({
      'bom-ref': `standard:${p.id}@${p.version}`,
      name: p.name,
      version: p.version,
      description: p.summary,
      owner: p.jurisdiction,
      externalReferences: [{ type: 'website', url: p.url }],
      requirements: p.controls
        .filter((c) => applicable.some((r) => r.controlId === c.id))
        .map((c) => ({
          'bom-ref': `requirement:${c.id}`,
          identifier: c.citations[0] ? `${c.citations[0].short} ${c.citations[0].locator}` : c.id,
          title: c.title,
          text: c.obligation,
          externalReferences: c.citations.map((ct) => ({ type: 'documentation', url: ct.url, comment: ct.title })),
        })),
    }));

  const claims = applicable.map((r) => ({
    'bom-ref': `claim:${r.controlId}`,
    target: `component:${report.snapshot.name}`,
    predicate: r.finding,
    ...(r.status === 'satisfied'
      ? { evidence: [`evidence:${r.controlId}`] }
      : { counterEvidence: [`evidence:${r.controlId}`] }),
    mitigationStrategies: r.gap ? [`mitigation:${r.controlId}`] : undefined,
  }));

  const evidence = applicable.map((r) => ({
    'bom-ref': `evidence:${r.controlId}`,
    propertyName: r.controlId,
    description:
      r.evidence.length > 0
        ? r.evidence
            .map((e) => (e.kind === 'absence' ? e.snippet : `${e.path}:${e.line} — ${e.snippet.trim()}`))
            .join(' | ')
        : 'No evidence located.',
    created: report.createdAt,
    signature: { algorithm: 'SHA-256', value: sha256(r.evidence.map((e) => `${e.path}:${e.line}:${e.fileSha256}`).join('\n')) },
  }));

  const attestation = {
    summary: `${report.classification.summary} Conformity score ${report.score}/100 across ${applicable.length} applicable obligations.`,
    assessor: 'assessor:annex',
    map: applicable.map((r) => ({
      requirement: `requirement:${r.controlId}`,
      claims: [`claim:${r.controlId}`],
      conformance: {
        score: conformance(r),
        rationale: r.finding,
        mitigationStrategies: r.gap ? [`mitigation:${r.controlId}`] : [],
      },
      confidence: { score: r.method === 'static-analysis' ? 0.9 : 0.7, rationale: `Determined by ${r.method}.` },
    })),
    signature: { algorithm: 'SHA-256', value: report.ledger.root },
  };

  return JSON.stringify(
    {
      $schema: SCHEMA,
      bomFormat: BOM_FORMAT,
      specVersion: SPEC_VERSION,
      serialNumber: urn(report.id),
      version: 1,
      metadata: {
        timestamp: report.createdAt,
        tools: {
          components: [
            { type: 'application', name: 'Annex', version: ENGINE_VERSION, publisher: 'Annex' },
          ],
        },
        component: {
          type: 'application',
          'bom-ref': `component:${report.snapshot.name}`,
          name: report.snapshot.name,
          version: (report.snapshot.commit ?? report.snapshot.id).slice(0, 12),
          description: report.profile.purpose || undefined,
        },
      },
      declarations: {
        assessors: [{ 'bom-ref': 'assessor:annex', thirdParty: false, organization: { name: 'Annex (self-assessment)' } }],
        attestations: [attestation],
        claims,
        evidence,
        ...(byPack.size ? {} : {}),
      },
      definitions: { standards },
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------

const MODEL_HINTS: { signal: string; name: string; provider: string }[] = [
  { signal: 'ai.provider.openai', name: 'OpenAI hosted model', provider: 'OpenAI' },
  { signal: 'ai.provider.anthropic', name: 'Anthropic hosted model', provider: 'Anthropic' },
  { signal: 'ai.provider.google', name: 'Google hosted model', provider: 'Google' },
  { signal: 'ai.provider.cloud', name: 'Managed inference platform', provider: 'Cloud provider' },
  { signal: 'ai.provider.openweights', name: 'Self-hosted open-weights model', provider: 'Self-hosted' },
];

export function toMlBom(report: ScanReport): string {
  const fired = new Set(report.signals.map((s) => s.id));

  const modelComponents = MODEL_HINTS.filter((h) => fired.has(h.signal)).map((h) => {
    const signal = report.signals.find((s) => s.id === h.signal);
    return {
      type: 'machine-learning-model',
      'bom-ref': `model:${h.signal}`,
      name: h.name,
      publisher: h.provider,
      description: signal?.description,
      modelCard: {
        modelParameters: { task: report.classification.tier === 'high' ? 'decision-support' : 'generation' },
        considerations: {
          useCases: [report.profile.purpose || 'Not stated by the operator.'],
          ethicalConsiderations: report.classification.findings.map((f) => ({
            name: f.title,
            mitigationStrategy: f.citations[0] ? `${f.citations[0].short} ${f.citations[0].locator}` : 'See classification.',
          })),
          technicalLimitations: report.controls
            .filter((c) => c.status === 'missing' && c.family === 'accuracy-robustness')
            .map((c) => c.finding),
        },
      },
      evidence: {
        occurrences: (signal?.evidence ?? []).slice(0, 5).map((e) => ({ location: `${e.path}:${e.line}` })),
      },
    };
  });

  return JSON.stringify(
    {
      $schema: SCHEMA,
      bomFormat: BOM_FORMAT,
      specVersion: SPEC_VERSION,
      serialNumber: urn(`mlbom:${report.id}`),
      version: 1,
      metadata: {
        timestamp: report.createdAt,
        tools: { components: [{ type: 'application', name: 'Annex', version: ENGINE_VERSION }] },
        component: {
          type: 'application',
          'bom-ref': `component:${report.snapshot.name}`,
          name: report.snapshot.name,
          version: (report.snapshot.commit ?? report.snapshot.id).slice(0, 12),
        },
        properties: [
          { name: 'annex:riskTier', value: report.classification.tier },
          { name: 'annex:role', value: report.classification.role },
          { name: 'annex:conformityScore', value: String(report.score) },
          { name: 'annex:ledgerRoot', value: report.ledger.root },
        ],
      },
      components: [
        ...modelComponents,
        ...report.snapshot.dependencies
          .filter((d) => !d.dev)
          .slice(0, 200)
          .map((d) => ({
            type: 'library',
            'bom-ref': `pkg:${d.ecosystem}/${d.name}`,
            name: d.name,
            version: d.version,
            purl: `pkg:${d.ecosystem}/${d.name}${d.version ? `@${d.version.replace(/^[\^~>=<]+/, '')}` : ''}`,
          })),
      ],
    },
    null,
    2,
  );
}
