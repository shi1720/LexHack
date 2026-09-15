import type { Control, RulePack } from '../types.js';
import { nistRmf } from './citations.js';
import { evidenceFrom, missing, pack, partial, satisfied, whenAiPresent, whenSignal } from './define.js';

const c = pack('nist-ai-rmf');

/**
 * The NIST AI Risk Management Framework is voluntary. It is in this corpus
 * because it is the framework enterprise buyers actually name in security
 * questionnaires, and because Texas TRAIGA makes documented internal review
 * against it a statutory affirmative defence.
 *
 * Subcategory IDs are version-pinned to AI RMF 1.0 (NIST AI 100-1, January
 * 2023). NIST has signalled a revision; when it lands, this pack's version
 * changes and every dossier that cited it is flagged stale.
 */
const PUBLISHED = '2023-01-26';

const controls: Control[] = [
  c({
    id: 'nist-ai-rmf.govern-1-1',
    title: 'GOVERN 1.1 — legal and regulatory requirements are understood and documented',
    obligation:
      'Legal and regulatory requirements involving AI are understood, managed, and documented.',
    family: 'quality-management',
    severity: 'medium',
    weight: 4,
    method: 'documentation',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('GOVERN 1.1', 'Legal and regulatory requirements involving AI are understood, managed, and documented.')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const ev = evidenceFrom(ctx, 'governance.ai-act.reference', 'governance.qms');
      // "Understood and documented" means a document. A statutory reference in
      // a code comment is a useful signal and not a regulatory analysis — and
      // since Annex writes those comments into the modules it generates,
      // accepting them here would let its own remediation answer the control.
      const documented = ev.filter((e) => e.kind === 'doc');
      if (ev.length > 0 && documented.length === 0) {
        return partial(
          'Statutory references appear in the code, but no document records which regimes apply and why.',
          'Write the analysis down: one page naming the instruments, your role under each, and which obligations bind today versus later. A citation in a comment shows someone knew; it does not show the organisation decided.',
          ev,
        );
      }
      return documented.length > 0
        ? satisfied('The repository documents the regulatory regimes that apply to it.', documented)
        : missing(
            'No documented understanding of the regulatory requirements that apply to this system was found.',
            'Record which regimes apply and why — one page naming the instruments, your role under each, and the obligations that bind today versus later.',
            ['AI Act reference', 'regulatory analysis', 'ISO 42001', 'NIST AI RMF'],
          );
    },
  }),
  c({
    id: 'nist-ai-rmf.govern-1-6',
    title: 'GOVERN 1.6 — an inventory of AI systems is maintained',
    obligation:
      'Mechanisms are in place to inventory AI systems and are resourced according to organizational risk priorities. An inventory nobody maintains by hand is an inventory that is wrong by the second sprint, so it should be generated from the codebase rather than typed into a spreadsheet.',
    family: 'documentation',
    severity: 'medium',
    weight: 3,
    method: 'manifest',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('GOVERN 1.6', 'Mechanisms are in place to inventory AI systems.')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const bom = ctx.findFile(/(ai-?bom|ml-?bom|model-?registry|models?\.ya?ml)/i);
      if (bom) {
        return satisfied('A machine-readable inventory of models was found.', [
          { path: bom.path, line: 1, snippet: bom.path, fileSha256: bom.sha256, kind: 'manifest' },
        ]);
      }
      const registry = evidenceFrom(ctx, 'control.model.version');
      return registry.length > 0
        ? partial(
            'Model identifiers appear in the code, but there is no single inventory artefact.',
            'Emit an ML-BOM (CycloneDX) so the models, datasets and services this system depends on can be enumerated without reading the source.',
            registry,
          )
        : missing(
            'No AI system or model inventory was found.',
            'Produce an inventory. Annex emits a CycloneDX ML-BOM from the scan, which satisfies this without hand-maintenance.',
            ['ai-bom.json', 'model registry', 'model inventory'],
          );
    },
    tests: [
      {
        name: 'missing when no model inventory exists at all',
        files: {
          'src/infer.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nexport const infer = (prompt) => client.responses.create({ input: prompt });\n',
        },
        expect: 'missing',
      },
      {
        // Pinned model ids scattered through the code are an inventory only in
        // the sense that a pile of receipts is a ledger.
        name: 'partial when model identifiers are pinned in code but never collected',
        files: {
          'src/infer.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nexport const infer = (p) => client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }] });\n',
          'src/models.ts':
            'export const MODEL_VERSION = "gpt-4o-2024-08-06";\nexport const modelName = "gpt-4o";\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when a machine-readable inventory artefact is present',
        files: {
          'src/infer.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nexport const infer = (p) => client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }] });\n',
          'ai-bom.json':
            '{\n  "bomFormat": "CycloneDX",\n  "components": [{ "type": "machine-learning-model", "name": "gpt-4o" }]\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nist-ai-rmf.map-1-1',
    title: 'MAP 1.1 — intended purpose and deployment context are documented',
    obligation:
      'Intended purposes, potentially beneficial uses, context-specific laws, norms and expectations, and prospective settings in which the AI system will be deployed are understood and documented.',
    family: 'documentation',
    severity: 'medium',
    weight: 4,
    method: 'documentation',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('MAP 1.1', 'Intended purposes and prospective settings are understood and documented.')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const ev = evidenceFrom(ctx, 'transparency.instructions', 'transparency.model-card');
      return ev.length > 0
        ? satisfied('The intended purpose and deployment context are documented.', ev)
        : missing(
            'The intended purpose of the system is not documented anywhere in the repository.',
            'State the intended purpose in one paragraph. Under the AI Act it is also the sentence that decides the risk classification, so it is worth writing carefully.',
            ['intended purpose', 'model card', 'instructions for use'],
          );
    },
    tests: [
      {
        name: 'missing when the intended purpose is nowhere in the repository',
        files: {
          'src/infer.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nexport const infer = (p) => client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }] });\n',
        },
        expect: 'missing',
      },
      {
        name: 'satisfied when a model card states the intended purpose',
        files: {
          'src/infer.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nexport const infer = (p) => client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: p }] });\n',
          'docs/model-card.md':
            '# Model card\n\n## Intended purpose\n\nDrafts replies to inbound support email for a human agent to send.\n\n## Out-of-scope uses\n\nNot for medical or legal advice.\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nist-ai-rmf.measure-2-11',
    title: 'MEASURE 2.11 — fairness and bias are evaluated and documented',
    obligation: 'Fairness and bias, as identified in the MAP function, are evaluated and results are documented.',
    family: 'data-governance',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('MEASURE 2.11', 'Fairness and bias are evaluated and results are documented.')],
    appliesWhen: whenSignal('domain.automated.decision', 'data.pii.handling'),
    evaluate: (ctx) => {
      const testing = ctx.signals.get('data.bias.testing');
      if (testing && testing.hits >= 2) return satisfied('Fairness evaluation was found in the codebase.', testing.evidence.slice(0, 4));
      if (testing && testing.hits === 1) {
        return partial('A single reference to fairness testing was found.', 'Document the results, not only the intent.', testing.evidence);
      }
      return missing(
        'No fairness or bias evaluation was found.',
        'Measure outcome rates across the groups the system is used on, and write down the result even when it is uncomfortable.',
        ['fairness', 'bias evaluation', 'disparate impact'],
      );
    },
    tests: [
      {
        name: 'missing when nothing measures outcomes across groups',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email };\n  const score = model.predict(record);\n  return { auto_decision: score > 0.5 ? "approve" : "reject", eligible: score > 0.5 };\n}\n',
        },
        expect: 'missing',
      },
      {
        name: 'partial when fairness is mentioned once and never measured',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email };\n  const score = model.predict(record);\n  return { auto_decision: score > 0.5 ? "approve" : "reject", eligible: score > 0.5 };\n}\n',
          'src/notes.ts':
            'export const TODO_FAIRNESS = "we should run a disparate impact check before launch";\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when outcome rates are actually computed across groups',
        files: {
          'src/decide.ts':
            'export function decide(person) {\n  const record = { full_name: person.full_name, email: person.email };\n  const score = model.predict(record);\n  return { auto_decision: score > 0.5 ? "approve" : "reject", eligible: score > 0.5 };\n}\n',
          'src/fairness.ts':
            'export function disparateImpact(results) {\n  const selectionRate = rate(results);\n  return { demographic_parity: demographicParity(results), equalised_odds: equalizedOdds(results), selectionRate };\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'nist-ai-rmf.measure-2-7',
    title: 'MEASURE 2.7 — security and resilience are evaluated',
    obligation:
      'AI system security and resilience are evaluated and documented. For a system built on a language model this means the AI-specific attack surface: prompt injection, jailbreaks, model evasion and data exfiltration through the model, not only the surrounding web application.',
    family: 'accuracy-robustness',
    severity: 'medium',
    weight: 4,
    method: 'static-analysis',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('MEASURE 2.7', 'AI system security and resilience are evaluated and documented.')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const ev = evidenceFrom(ctx, 'security.prompt-injection', 'security.redteam', 'security.auth');
      if (ctx.signals.hasAny('security.secrets.hardcoded')) {
        return {
          status: 'missing',
          finding: 'A credential appears to be committed to this repository, which undermines any resilience claim.',
          gap: 'Rotate the credential and move it to a secret manager before anything else.',
          evidence: evidenceFrom(ctx, 'security.secrets.hardcoded'),
        };
      }
      return ev.length >= 2
        ? satisfied('Security controls on the model path were found.', ev)
        : missing(
            'No AI-specific security evaluation was found.',
            'Add input and output moderation on the model path and an adversarial test suite.',
            ['prompt injection defence', 'red team', 'adversarial testing'],
          );
    },
  }),
  c({
    id: 'nist-ai-rmf.manage-4-1',
    title: 'MANAGE 4.1 — post-deployment monitoring plans are implemented',
    obligation:
      'Post-deployment AI system monitoring plans are implemented, including mechanisms for capturing and evaluating input from users and other relevant AI actors, appeal and override, decommissioning, incident response, recovery, and change management.',
    family: 'post-market',
    severity: 'high',
    weight: 5,
    method: 'static-analysis',
    appliesFrom: PUBLISHED,
    citations: [nistRmf('MANAGE 4.1', 'Post-deployment AI system monitoring plans are implemented.')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const parts = [
        ctx.signals.hasAny('quality.monitoring') && 'monitoring',
        ctx.signals.hasAny('control.appeal', 'control.override') && 'appeal or override',
        ctx.signals.hasAny('governance.incident-response') && 'incident response',
        ctx.signals.hasAny('governance.change-control', 'governance.ci') && 'change management',
      ].filter(Boolean) as string[];
      const ev = evidenceFrom(ctx, 'quality.monitoring', 'control.appeal', 'governance.incident-response', 'governance.ci');
      if (parts.length >= 3) return satisfied(`Post-deployment mechanisms found: ${parts.join(', ')}.`, ev);
      if (parts.length > 0) {
        return partial(`Found ${parts.join(' and ')}.`, 'MANAGE 4.1 expects monitoring, appeal and override, incident response and change management together.', ev);
      }
      return missing(
        'No post-deployment monitoring mechanisms were found.',
        'Implement monitoring, an appeal path, incident response and change management before the system is relied on in production.',
        ['monitoring', 'appeal', 'incident response', 'change management'],
      );
    },
  }),
];

export const NIST_AI_RMF_PACK: RulePack = {
  id: 'nist-ai-rmf',
  name: 'NIST AI RMF 1.0',
  version: '2026.09.1',
  jurisdiction: 'United States (voluntary framework)',
  instrument: 'NIST AI Risk Management Framework 1.0 (NIST AI 100-1)',
  reconciledOn: '2026-09-15',
  summary:
    'Voluntary, but it is the framework enterprise buyers name in security questionnaires, and Texas TRAIGA makes documented internal review against it a statutory affirmative defence. Subcategory IDs are pinned to AI RMF 1.0; NIST has signalled a revision.',
  url: 'https://www.nist.gov/itl/ai-risk-management-framework',
  milestones: [{ date: PUBLISHED, label: 'AI RMF 1.0 published', note: 'Voluntary framework; no statutory deadline.' }],
  controls,
};
