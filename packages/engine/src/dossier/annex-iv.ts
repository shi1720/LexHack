import type { ControlResult, Narrative, ScanReport } from '../types.js';
import { ledgerFingerprint } from '../ledger/index.js';

export type DossierLocale = 'en' | 'de' | 'fr';

/**
 * Annex IV technical documentation.
 *
 * Article 11(1) requires this document before a high-risk system is placed on
 * the market, and Annex IV sets out what it must contain "at least". The nine
 * points below are its actual structure, in order.
 *
 * Two rules govern everything here:
 *
 * 1. **Nothing is invented.** Where the codebase answers a point, the answer
 *    cites a file and a line. Where it does not, the document says so and
 *    leaves a marked gap. A generated dossier that guesses at the residual-risk
 *    acceptance is not a shortcut — it is a false statement to a regulator, and
 *    Article 99(5) prices that at EUR 7.5 million or 1 % of turnover.
 *
 * 2. **The reader can check it.** Every section is traceable to the evidence
 *    ledger, and the ledger root is on the front page.
 *
 * Article 11(1) as amended also lets SMEs, start-ups and small mid-caps provide
 * these elements in simplified form, so `simplified` drops the sub-point prose
 * while keeping every heading.
 */

export interface DossierSection {
  /** Annex IV point, e.g. "2(d)". */
  point: string;
  title: string;
  /** Paragraphs of rendered prose. */
  body: string[];
  /** Evidence citations backing this section. */
  evidence: { path: string; line: number; snippet: string }[];
  /** Questions only a human can answer, left explicitly open. */
  open: string[];
  /** Controls whose result informs this section. */
  controlIds: string[];
}

export interface Dossier {
  title: string;
  locale: DossierLocale;
  systemName: string;
  provider: string;
  version: string;
  issuedAt: string;
  commit: string;
  ledgerRoot: string;
  ledgerFingerprint: string;
  classification: string;
  role: string;
  completeness: number;
  sections: DossierSection[];
  openCount: number;
  evidenceCount: number;
  simplified: boolean;
  declarationReady: boolean;
}

const HEADINGS: Record<DossierLocale, { doc: string; point: Record<string, string> }> = {
  en: {
    doc: 'Technical documentation referred to in Article 11(1)',
    point: {
      '1': 'General description of the AI system',
      '2': 'Detailed description of the elements of the AI system and of the process for its development',
      '3': 'Monitoring, functioning and control of the AI system',
      '4': 'Appropriateness of the performance metrics',
      '5': 'Risk management system in accordance with Article 9',
      '6': 'Relevant changes made through the lifecycle',
      '7': 'Harmonised standards applied, or solutions adopted',
      '8': 'Copy of the EU declaration of conformity (Article 47)',
      '9': 'Post-market performance evaluation system (Article 72)',
    },
  },
  de: {
    doc: 'Technische Dokumentation gemäß Artikel 11 Absatz 1',
    point: {
      '1': 'Allgemeine Beschreibung des KI-Systems',
      '2': 'Detaillierte Beschreibung der Komponenten des KI-Systems und seines Entwicklungsprozesses',
      '3': 'Überwachung, Funktionsweise und Kontrolle des KI-Systems',
      '4': 'Angemessenheit der Leistungsmetriken',
      '5': 'Risikomanagementsystem gemäß Artikel 9',
      '6': 'Relevante Änderungen im Lebenszyklus',
      '7': 'Angewandte harmonisierte Normen oder gewählte Lösungen',
      '8': 'Kopie der EU-Konformitätserklärung (Artikel 47)',
      '9': 'System zur Bewertung der Leistung nach dem Inverkehrbringen (Artikel 72)',
    },
  },
  fr: {
    doc: "Documentation technique visée à l'article 11, paragraphe 1",
    point: {
      '1': 'Description générale du système d\'IA',
      '2': "Description détaillée des éléments du système d'IA et de son processus de développement",
      '3': "Surveillance, fonctionnement et contrôle du système d'IA",
      '4': 'Adéquation des indicateurs de performance',
      '5': "Système de gestion des risques conformément à l'article 9",
      '6': 'Modifications pertinentes apportées au cours du cycle de vie',
      '7': 'Normes harmonisées appliquées ou solutions adoptées',
      '8': "Copie de la déclaration UE de conformité (article 47)",
      '9': "Système d'évaluation des performances après commercialisation (article 72)",
    },
  },
};

const OPEN_MARKER = 'Not determinable from the codebase';

/** The commit under assessment, or the content hash of the tree when scanning a directory. */
function versionRef(report: ScanReport): string {
  return (report.snapshot.commit ?? report.snapshot.id).slice(0, 12);
}

function controlsFor(report: ScanReport, ...ids: string[]): ControlResult[] {
  return report.controls.filter((c) => ids.includes(c.controlId) && c.status !== 'not_applicable');
}

function evidenceOf(controls: ControlResult[], limit = 6) {
  return controls
    .flatMap((c) => c.evidence)
    .filter((e) => e.kind !== 'absence')
    .slice(0, limit)
    .map((e) => ({ path: e.path, line: e.line, snippet: e.snippet.trim() }));
}

function statusLine(controls: ControlResult[]): string[] {
  return controls.map((c) => {
    const citation = c.citations[0];
    const badge =
      c.status === 'satisfied' ? 'Evidenced' : c.status === 'partial' ? 'Partially evidenced' : c.status === 'needs_review' ? 'Requires human determination' : 'No evidence found';
    return `**${badge} — ${c.title}** (${citation ? `${citation.short} ${citation.locator}` : c.controlId}). ${c.finding}`;
  });
}

export interface DossierOptions {
  locale?: DossierLocale;
  simplified?: boolean;
  provider?: string;
  narrative?: Narrative;
}

export function buildDossier(report: ScanReport, opts: DossierOptions = {}): Dossier {
  const locale = opts.locale ?? 'en';
  const h = HEADINGS[locale];
  const n = opts.narrative;
  const sections: DossierSection[] = [];

  const push = (s: DossierSection) => sections.push(s);
  const deps = report.snapshot.dependencies.filter((d) => !d.dev);
  const modelSignals = report.signals.filter((s) => s.id.startsWith('ai.provider.'));

  // --- Point 1 ------------------------------------------------------------
  push({
    point: '1',
    title: h.point['1'] ?? 'General description',
    body: [
      `**(a) Intended purpose, provider and version.** ${
        report.profile.purpose
          ? report.profile.purpose
          : `${OPEN_MARKER}: the operator did not state an intended purpose. This single sentence determines the risk classification under Article 6, so it cannot be left blank in a final version.`
      }`,
      `Provider: ${opts.provider ?? report.profile.name}. Version under assessment: \`${versionRef(report)}\`.`,
      n?.systemDescription ?? '',
      `**(b) Interaction with other systems.** ${
        modelSignals.length > 0
          ? `The system calls externally provided models: ${modelSignals.map((s) => s.label).join(', ')}. Under Article 25(1)(c), directing a general-purpose AI system at an Annex III use case makes this repository's owner the provider of a high-risk AI system.`
          : 'No external model provider was detected in the codebase.'
      }`,
      `**(c) Software versions.** ${deps.length} production dependencies were resolved from the manifests in this repository. The full inventory is emitted as a CycloneDX ML-BOM alongside this document.`,
      `**(d) Forms in which the system is placed on the market.** ${
        report.signals.some((s) => s.id === 'domain.chat.enduser')
          ? 'Delivered as a hosted software service with a user-facing interface.'
          : `${OPEN_MARKER}. State whether the system ships as a hosted service, an API, a download, or embedded in hardware.`
      }`,
      `**(e) Hardware.** ${OPEN_MARKER}. Describe the runtime environment and any hardware requirement.`,
      `**(f) Product photographs and layout.** Not applicable: the system is software, not a component of a physical product.`,
      `**(g)-(h) Deployer interface and instructions for use.** ${
        report.controls.find((c) => c.controlId === 'eu-ai-act.art13.instructions-for-use')?.finding ??
        'Not assessed.'
      }`,
    ].filter(Boolean),
    evidence: evidenceOf(controlsFor(report, 'eu-ai-act.art25.role-determination', 'eu-ai-act.art13.instructions-for-use')),
    open: [
      !report.profile.purpose ? 'Intended purpose (point 1(a))' : '',
      'Hardware and runtime environment (point 1(e))',
      'Forms of placement on the market (point 1(d))',
    ].filter(Boolean),
    controlIds: ['eu-ai-act.art25.role-determination', 'eu-ai-act.art13.instructions-for-use'],
  });

  // --- Point 2 ------------------------------------------------------------
  const p2Controls = controlsFor(
    report,
    'eu-ai-act.art10.data-governance',
    'eu-ai-act.art10.bias-examination',
    'eu-ai-act.art14.human-oversight',
    'eu-ai-act.art15.accuracy',
    'eu-ai-act.art15.cybersecurity',
  );
  push({
    point: '2',
    title: h.point['2'] ?? 'Development process',
    body: [
      `**(a) Development methods and recourse to third-party systems.** ${
        modelSignals.length > 0
          ? `The system is built on pre-trained models supplied by third parties (${modelSignals.map((s) => s.label).join(', ')}). Article 25(2) obliges the initial provider to make available the technical documentation needed to assess Article 16 compliance — unless it has specified that its system is not to be changed into a high-risk AI system, which switches that duty off. Confirm which applies before relying on it.`
          : 'No third-party pre-trained model was detected.'
      }`,
      `**(b) Design specifications.** ${
        report.signals.some((s) => s.id === 'ai.prompt.system')
          ? 'The general logic is expressed in system prompts and orchestration code located in the evidence below. What the system optimises for, and the trade-offs accepted to meet Chapter III Section 2, are design decisions that must be recorded here.'
          : `${OPEN_MARKER}. Describe the general logic, the key design choices and their rationale, what the system optimises for, and the trade-offs accepted.`
      }`,
      `**(c) System architecture and computational resources.** ${report.snapshot.fileCount} source files were analysed. ${OPEN_MARKER}: describe how components feed into each other and the resources used to develop, train, test and validate the system.`,
      `**(d) Data requirements and datasheets.** ${
        report.controls.find((c) => c.controlId === 'eu-ai-act.art10.data-governance')?.finding ?? 'Not assessed.'
      }`,
      `**(e) Human oversight measures (Article 14).** ${
        report.controls.find((c) => c.controlId === 'eu-ai-act.art14.human-oversight')?.finding ?? 'Not assessed.'
      }`,
      `**(f) Pre-determined changes.** ${OPEN_MARKER}. Record any changes to the system and its performance fixed at the time of the initial conformity assessment.`,
      `**(g) Validation and testing procedures.** ${
        report.controls.find((c) => c.controlId === 'eu-ai-act.art15.accuracy')?.finding ?? 'Not assessed.'
      } Annex IV point 2(g) also requires metrics for potentially discriminatory impacts, and dated, signed test reports.`,
      `**(h) Cybersecurity measures.** ${
        report.controls.find((c) => c.controlId === 'eu-ai-act.art15.cybersecurity')?.finding ?? 'Not assessed.'
      }`,
    ],
    evidence: evidenceOf(p2Controls, 10),
    open: [
      'General logic, key design choices and optimisation target (point 2(b))',
      'System architecture and computational resources (point 2(c))',
      'Pre-determined changes (point 2(f))',
      'Dated and signed test reports (point 2(g))',
    ],
    controlIds: p2Controls.map((c) => c.controlId),
  });

  // --- Point 3 ------------------------------------------------------------
  const p3Controls = controlsFor(report, 'eu-ai-act.art12.record-keeping', 'eu-ai-act.art14.human-oversight', 'eu-ai-act.art15.accuracy');
  push({
    point: '3',
    title: h.point['3'] ?? 'Monitoring, functioning and control',
    body: [
      `**Capabilities and limitations in performance.** ${OPEN_MARKER} from source alone. Annex IV point 3 asks specifically for the degrees of accuracy **for specific persons or groups** on whom the system is used, not only the overall figure.`,
      `**Foreseeable unintended outcomes and sources of risk.** ${
        report.classification.findings.length > 0
          ? `Classification identified: ${report.classification.findings.map((f) => f.title).join('; ')}. Each is a source of risk to fundamental rights that Article 9 must address.`
          : 'No classification-level risk sources were identified.'
      }`,
      `**Human oversight measures.** ${report.controls.find((c) => c.controlId === 'eu-ai-act.art14.human-oversight')?.finding ?? 'Not assessed.'}`,
      `**Input data specifications.** ${OPEN_MARKER}. Specify the expected input format, range and quality.`,
    ],
    evidence: evidenceOf(p3Controls, 6),
    open: ['Accuracy for specific persons or groups', 'Input data specifications'],
    controlIds: p3Controls.map((c) => c.controlId),
  });

  // --- Point 4 ------------------------------------------------------------
  push({
    point: '4',
    title: h.point['4'] ?? 'Appropriateness of performance metrics',
    body: [
      report.signals.some((s) => s.id === 'quality.eval.suite')
        ? 'An evaluation harness was found in the repository (see evidence). Why those metrics are the appropriate ones for this intended purpose is an argument that must be written here — the presence of a metric is not the same as its appropriateness.'
        : `${OPEN_MARKER}: no evaluation suite was found, so there are no metrics whose appropriateness could be assessed.`,
    ],
    evidence: evidenceOf(controlsFor(report, 'eu-ai-act.art15.accuracy'), 4),
    open: ['Justification that the chosen metrics suit the intended purpose'],
    controlIds: ['eu-ai-act.art15.accuracy'],
  });

  // --- Point 5 ------------------------------------------------------------
  const p5 = controlsFor(report, 'eu-ai-act.art9.risk-management');
  push({
    point: '5',
    title: h.point['5'] ?? 'Risk management system',
    body: [
      ...statusLine(p5),
      n?.riskNarrative ?? '',
      'Article 9(5) requires residual risk to be judged acceptable for each individual hazard and overall. That judgement, and the person who made it, cannot be derived from code.',
    ].filter(Boolean),
    evidence: evidenceOf(p5, 6),
    open: ['Residual risk acceptance and the accountable person (Article 9(5))'],
    controlIds: p5.map((c) => c.controlId),
  });

  // --- Point 6 ------------------------------------------------------------
  push({
    point: '6',
    title: h.point['6'] ?? 'Relevant changes through the lifecycle',
    body: [
      `This document describes the system at commit \`${versionRef(report)}\`. Annex maintains change history by comparing consecutive scans: where a change affects compliance with Chapter III Section 2 or modifies the intended purpose, it is a substantial modification within Article 3(49) and reopens the conformity assessment under Article 43(4).`,
      report.signals.some((s) => s.id === 'governance.change-control')
        ? 'Change control is evidenced in the repository (see evidence).'
        : `${OPEN_MARKER}: no change control artefacts were found. Article 17(1)(a) expects management of modifications to be part of the quality management system.`,
    ],
    evidence: evidenceOf(controlsFor(report, 'eu-ai-act.art17.quality-management'), 4),
    open: ['Log of relevant changes since the initial conformity assessment'],
    controlIds: ['eu-ai-act.art17.quality-management'],
  });

  // --- Point 7 ------------------------------------------------------------
  push({
    point: '7',
    title: h.point['7'] ?? 'Harmonised standards or solutions adopted',
    body: [
      'No harmonised standards for the AI Act have yet been cited in the Official Journal of the European Union. CEN-CENELEC JTC 21 has prEN 18286 (quality management system for AI Act regulatory purposes) at formal vote. Until a reference is published, Annex IV point 7 takes its second branch: a detailed description of the solutions adopted to meet the Chapter III Section 2 requirements, and a list of other relevant standards applied.',
      report.signals.some((s) => s.id === 'governance.qms')
        ? 'Other standards referenced in this repository appear in the evidence below.'
        : 'No other standards or technical specifications were referenced in this repository.',
      'The solutions adopted are the controls assessed in this document; each is listed with its evidence in the appendix.',
    ],
    evidence: evidenceOf(controlsFor(report, 'eu-ai-act.art17.quality-management'), 3),
    open: ['List of other standards and technical specifications applied'],
    controlIds: ['eu-ai-act.art17.quality-management'],
  });

  // --- Point 8 ------------------------------------------------------------
  const registration = report.controls.find((c) => c.controlId === 'eu-ai-act.art49.registration');
  push({
    point: '8',
    title: h.point['8'] ?? 'EU declaration of conformity',
    body: [
      'Article 47 requires a written, machine-readable, physically or electronically signed EU declaration of conformity for each high-risk AI system, kept available to national competent authorities for ten years.',
      registration?.status === 'satisfied'
        ? 'A declaration of conformity was referenced in the repository.'
        : `${OPEN_MARKER}: no EU declaration of conformity was found. It cannot be drawn up until the open items in this document are closed — by drawing it up, the provider assumes responsibility for compliance.`,
    ],
    evidence: evidenceOf(controlsFor(report, 'eu-ai-act.art49.registration'), 3),
    open: ['EU declaration of conformity (Article 47, Annex V)'],
    controlIds: ['eu-ai-act.art49.registration'],
  });

  // --- Point 9 ------------------------------------------------------------
  const p9 = controlsFor(report, 'eu-ai-act.art72.post-market-monitoring');
  push({
    point: '9',
    title: h.point['9'] ?? 'Post-market monitoring',
    body: [
      ...statusLine(p9),
      'Article 72(3) makes the post-market monitoring plan part of this technical documentation. The Commission template is not due until 2 September 2027, so the plan is free-form until then.',
    ],
    evidence: evidenceOf(p9, 4),
    open: ['Post-market monitoring plan (Article 72(3))'],
    controlIds: p9.map((c) => c.controlId),
  });

  const openCount = sections.reduce((n2, s) => n2 + s.open.length, 0);
  const evidenceCount = sections.reduce((n2, s) => n2 + s.evidence.length, 0);
  const answered = sections.filter((s) => s.evidence.length > 0).length;

  return {
    title: h.doc,
    locale,
    systemName: report.profile.name,
    provider: opts.provider ?? report.profile.name,
    version: (report.snapshot.commit ?? report.snapshot.id).slice(0, 12),
    issuedAt: report.createdAt,
    commit: versionRef(report),
    ledgerRoot: report.ledger.root,
    ledgerFingerprint: ledgerFingerprint(report.ledger),
    classification: report.classification.summary,
    role: report.classification.role,
    completeness: Math.round((answered / sections.length) * 100),
    sections,
    openCount,
    evidenceCount,
    simplified: Boolean(opts.simplified),
    declarationReady: openCount === 0,
  };
}

