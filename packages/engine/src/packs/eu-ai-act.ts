import type { Control, EvaluationContext, RulePack } from '../types.js';
import { aiActAnnex, aiActArticle } from './citations.js';
import {
  allOf,
  anyOf,
  always,
  evidenceFrom,
  missing,
  needsReview,
  notApplicable,
  pack,
  partial,
  satisfied,
  whenAiPresent,
  whenFinding,
  whenHighRisk,
  whenHighRiskOrDerogated,
  whenDeployer,
  whenProvider,
  whenSignal,
} from './define.js';
import {
  auditLogModule,
  contentMarkingModule,
  disclosureModule,
  humanOversightModule,
  primaryLanguage,
} from './remediation-templates.js';
import {
  ciWorkflow,
  dataGovernanceDoc,
  incidentResponseDoc,
  instructionsForUseDoc,
  postMarketMonitoringDoc,
  riskManagementDoc,
} from './doc-templates.js';

const c = pack('eu-ai-act');

/**
 * Application dates, as amended by the Digital Omnibus on AI —
 * Regulation (EU) 2026/1744, in force 27 July 2026.
 *
 * The Omnibus moved the Annex III high-risk date from 2 August 2026 to
 * 2 December 2027 and the Annex I date to 2 August 2028. It did **not** move
 * Article 50. That asymmetry is the single most consequential fact about
 * AI Act compliance in 2026, and it is why every control here carries its own
 * date instead of inheriting one deadline.
 */
export const DATES = {
  /** Chapters I and II — AI literacy and the prohibited practices. */
  PROHIBITIONS: '2025-02-02',
  /** Chapter V — general-purpose AI model obligations. */
  GPAI: '2025-08-02',
  /** General application, including Chapter IV / Article 50 transparency. */
  GENERAL: '2026-08-02',
  /** Art. 111(4) grace for generative systems on the market before 2 Aug 2026. */
  MARKING_GRACE: '2026-12-02',
  /** New Art. 5(1)(ba)/(bb) prohibitions inserted by the Omnibus. */
  NEW_PROHIBITIONS: '2026-12-02',
  /**
   * Chapter III **Sections 1, 2 and 3** as regards Annex III high-risk systems.
   *
   * Article 113 as amended defers exactly those sections — the classification
   * rules, the requirements, and the obligations on providers and deployers —
   * and nothing else. Read the constant's name literally when assigning it.
   */
  HIGH_RISK_ANNEX_III: '2027-12-02',
  /** The same sections, as regards Annex I high-risk systems (Art. 6(1)). */
  HIGH_RISK_ANNEX_I: '2028-08-02',
} as const;

/*
 * A note on Articles 43, 47, 48, 49, 72 and 73, because this is the
 * distinction the product exists to get right and we got it wrong once.
 *
 * Article 49 sits in Chapter III **Section 5**; Articles 72 and 73 sit in
 * Chapter IX. The Digital Omnibus deferred Sections 1, 2 and 3 of Chapter III
 * and left everything else where Article 113(2) put it: 2 August 2026. So
 * these obligations are in force **today**, sixteen months before the
 * high-risk requirements they relate to.
 *
 * That reads oddly, and the temptation is to "correct" it by dating them with
 * the rest of the high-risk regime — which is exactly what this file did until
 * a reviewer checked it against our own research note, where the right answer
 * was already written down. A tool that sells itself on reading Article 113
 * rather than repeating what the industry assumes does not then quietly
 * substitute a practitioner's view of what is sensible for the date the
 * Regulation gives. Each of these controls carries the statutory date, and
 * says in its own finding why the duty may not bite in practice yet.
 */

/**
 * The sentence the header above promises and this file did not carry.
 *
 * Articles 49, 72, 73 and 86 apply from 2 August 2026 on the face of Article
 * 113, and every one of them is predicated on a system being high-risk under
 * Annex III — a status Article 6(2) does not confer until 2 December 2027.
 * Annex reports the statutory date, because that is what the Regulation says
 * and substituting a practitioner's view of what is sensible is the failure
 * mode this product exists to avoid. But reporting the date without the
 * qualification tells an operator to act on a duty whose subject-matter does
 * not exist yet, which is its own kind of wrong answer.
 */
const TIMING_HEDGE =
  'Timing: this duty carries the general application date because of where it sits in the Regulation, but it is predicated on a system being high-risk under Annex III, and Article 6(2) — the provision that makes it so — is deferred to 2 December 2027. Treat the date as the outer limit of your exposure rather than as a duty that bites on a system nobody has yet had to classify.';

const ANNEX_IV_DOC = 'docs/ai-act/annex-iv-technical-documentation.md';

/**
 * Which documents may answer which duty.
 *
 * A repo-wide grep for "risk management" is happily answered by those two
 * words appearing inside an incident-response runbook, and Article 9 goes
 * green because a document about something else mentioned it.
 *
 * Every documentation control names the topic that entitles a document to
 * satisfy it. A document qualifies either because its **name** is on topic —
 * `risk-management.md` answers Article 9 — or because the match sits under an
 * on-topic **heading**, which is how a README with a "Risk management" section
 * qualifies while a README that merely says the words does not. An earlier
 * version made `readme` an always-eligible alternative, and a twelve-line
 * README of compliance phrases turned three obligations green.
 */
const GENERAL_DOC = 'annex[-_]?iv|conformity';
const docScope = (topic: string): RegExp => new RegExp(`(${topic}|${GENERAL_DOC})`, 'i');

const DOC_SCOPES = {
  risk: docScope('risk|hazard|safety|fmea'),
  data: docScope('data|dataset|datasheet|corpus|training'),
  instructions: docScope('instruction|manual|user[-_]?guide|usage|deploy'),
  postMarket: docScope('post[-_]?market|monitor|observab|drift|slo'),
  incident: docScope('incident|escalation|runbook|on[-_]?call|postmortem|post[-_]?mortem'),
  literacy: docScope('literacy|training|onboarding|policy|handbook'),
  limitations: docScope('limitation|model[-_]?card|known[-_]?issue|caveat'),
  accuracy: docScope('accurac|eval|benchmark|metric|model[-_]?card|test'),
  bias: docScope('bias|audit|fairness|impact[-_]?ratio|disparate'),
} as const;


// ===========================================================================
// Chapter II — prohibited practices. In force since 2 February 2025.
// ===========================================================================

const prohibitionControls: Control[] = [
  c({
    id: 'eu-ai-act.art5.emotion-workplace',
    penaltyTier: 'art99-3',
    title: 'No emotion inference in the workplace or education',
    obligation:
      'Article 5(1)(f) prohibits placing on the market, putting into service or using AI systems to infer emotions of a natural person in the areas of workplace and education institutions, except for medical or safety reasons.',
    family: 'prohibition',
    severity: 'critical',
    weight: 10,
    method: 'static-analysis',
    appliesFrom: DATES.PROHIBITIONS,
    citations: [
      aiActArticle(5, '(1)(f)', 'Prohibited AI practices — emotion inference at work or school'),
      aiActArticle(99, '(3)', 'Penalties — EUR 35 000 000 or 7 % of worldwide annual turnover'),
    ],
    appliesWhen: whenSignal('domain.emotion.recognition'),
    evaluate: (ctx) => {
      const inScope = ctx.signals.hasAny(
        'domain.employment.screening',
        'domain.employment.management',
        'domain.education.assessment',
      );
      const ev = evidenceFrom(ctx, 'domain.emotion.recognition');
      if (!inScope) {
        return partial(
          'Emotion inference was detected, but not in an employment or education context. Article 5(1)(f) is not engaged; Annex III, point 1(c) classifies the system as high-risk instead.',
          'Confirm the deployment context. If the system is ever used by an employer or an education institution, the prohibition applies and the system cannot lawfully be placed on the EU market.',
          ev,
        );
      }
      return {
        status: 'missing',
        finding:
          'This repository infers emotional or affective state from people in a recruitment, employment or education context. Article 5(1)(f) prohibits that outright.',
        gap: 'Remove the emotion inference feature, or establish and document that the system is placed on the market for medical or safety reasons — the only carve-out in Article 5(1)(f). No amount of consent, disclosure or human review cures a prohibited practice.',
        evidence: ev,
        score: 0,
      };
    },
    tests: [
      {
        name: 'fires on emotion scoring in a hiring pipeline',
        files: {
          'src/interview.py':
            'def score_candidate(video):\n    emotion_score = detect_emotion(video.frames)\n    return applicant_rank(emotion_score)\n',
        },
        expect: 'missing',
      },
      {
        name: 'downgrades to partial outside work and education',
        files: {
          'src/wellness.py': 'def mood_detection(audio):\n    return classify_emotion(audio)\n',
        },
        expect: 'partial',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art5.social-scoring',
    penaltyTier: 'art99-3',
    title: 'No social scoring of natural persons',
    obligation:
      'Article 5(1)(c) prohibits evaluating or classifying natural persons over time based on social behaviour or personal characteristics where the score leads to detrimental treatment in an unrelated context, or to treatment that is unjustified or disproportionate.',
    family: 'prohibition',
    severity: 'critical',
    weight: 8,
    method: 'static-analysis',
    appliesFrom: DATES.PROHIBITIONS,
    citations: [aiActArticle(5, '(1)(c)', 'Prohibited AI practices — social scoring')],
    appliesWhen: whenSignal('domain.social-scoring'),
    evaluate: (ctx) =>
      needsReview(
        'A general-purpose score over people was detected. Article 5(1)(c) bites only where the score causes detrimental treatment in a social context unrelated to the one the data was collected in, or treatment disproportionate to the behaviour.',
        'Document what the score is used for downstream and who is treated differently because of it. If the answer crosses contexts, the practice is prohibited.',
        evidenceFrom(ctx, 'domain.social-scoring'),
      ),
  }),
  c({
    id: 'eu-ai-act.art5.face-scraping',
    penaltyTier: 'art99-3',
    title: 'No untargeted scraping of facial images',
    obligation:
      'Article 5(1)(e) prohibits creating or expanding facial recognition databases through untargeted scraping of facial images from the internet or CCTV footage.',
    family: 'prohibition',
    severity: 'critical',
    weight: 8,
    method: 'static-analysis',
    appliesFrom: DATES.PROHIBITIONS,
    citations: [aiActArticle(5, '(1)(e)', 'Prohibited AI practices — untargeted facial-image scraping')],
    appliesWhen: whenSignal('domain.biometric.scraping'),
    evaluate: (ctx) => ({
      status: 'missing',
      finding: 'Code that harvests facial images to build or expand a recognition database was detected.',
      gap: 'Remove the untargeted collection path. Article 5(1)(e) has no consent-based or legitimate-interest exception.',
      evidence: evidenceFrom(ctx, 'domain.biometric.scraping'),
      score: 0,
    }),
  }),
  c({
    id: 'eu-ai-act.art5.ncii-csam-safeguards',
    penaltyTier: 'art99-3',
    title: 'Safeguards against non-consensual intimate imagery and CSAM',
    obligation:
      'Article 5(1)(ba) and (bb), inserted by Regulation (EU) 2026/1744, prohibit AI systems that generate non-consensual intimate imagery or child sexual abuse material. Article 5(1a)(a)(ii) extends the prohibition to systems where such generation is a reasonably foreseeable and reproducible outcome without significant technical modification and there are no reasonable and adequate technical safeguards to reliably prevent it.',
    family: 'prohibition',
    severity: 'critical',
    weight: 9,
    method: 'static-analysis',
    appliesFrom: DATES.NEW_PROHIBITIONS,
    citations: [
      aiActArticle(5, '(1)(ba)', 'Prohibited AI practices — non-consensual intimate imagery'),
      aiActArticle(5, '(1)(bb)', 'Prohibited AI practices — child sexual abuse material'),
      aiActArticle(5, '(1a)', 'Scope of points (ba) and (bb)'),
    ],
    appliesWhen: whenSignal('domain.synthetic.content'),
    evaluate: (ctx) => {
      const guarded = ctx.signals.hasAny('security.prompt-injection');
      const ev = evidenceFrom(ctx, 'security.prompt-injection', 'domain.synthetic.content');
      if (guarded) {
        return partial(
          'Content filtering or moderation was found alongside the generative pipeline.',
          'Article 5(1a)(a)(ii) asks whether the safeguards *reliably prevent* the generation, taking account of reasonably foreseeable misuse. Record the red-team results that show they do, and the process for correcting observed or reported misuse. Applies from 2 December 2026.',
          ev,
        );
      }
      return missing(
        'This system generates or manipulates image, audio or video content, and no moderation or safety filter was detected on the generation path.',
        'Add input and output moderation on the generative path and document the red-teaming that demonstrates it reliably prevents intimate-imagery and CSAM outputs. This becomes a prohibited practice on 2 December 2026 if the safeguards are inadequate.',
        ['security.prompt-injection', 'content moderation on the generation path'],
      );
    },
  }),
];

// ===========================================================================
// Chapter I + IV — obligations that bind every AI system, in force today.
// ===========================================================================

const liveControls: Control[] = [
  c({
    id: 'eu-ai-act.art4.ai-literacy',
    title: 'Measures to support AI literacy',
    obligation:
      'Article 4 requires providers and deployers to take measures to support the development of AI literacy of their staff and other persons operating the system on their behalf. It binds every AI system, not only high-risk ones.',
    family: 'quality-management',
    severity: 'low',
    weight: 2,
    method: 'documentation',
    appliesFrom: DATES.PROHIBITIONS,
    citations: [aiActArticle(4, '', 'AI literacy')],
    appliesWhen: whenAiPresent,
    evaluate: (ctx) => {
      const ev = ctx.grepDocs(/\bai[\s-]?(literacy|training|onboarding|usage[\s-]?polic)/i, 4, DOC_SCOPES.literacy);
      if (ev.length > 0) {
        return satisfied('Documentation referring to AI training or usage policy was found.', ev);
      }
      return missing(
        'No AI literacy or AI usage policy documentation was found.',
        'Add a short internal page covering what the system does, what it cannot do, and how staff should treat its output. Article 4 as amended does not require you to guarantee any individual competence level — only to take measures.',
        ['AI literacy policy', 'AI usage guidance', 'staff training documentation'],
      );
    },
  }),
  c({
    id: 'eu-ai-act.art50.1.interaction-disclosure',
    penaltyTier: 'art99-4',
    title: 'Tell people they are talking to an AI',
    obligation:
      'Article 50(1) requires providers of AI systems intended to interact directly with natural persons to design them so that those persons are informed they are interacting with an AI system, unless that is obvious to a reasonably well-informed, observant and circumspect person. Article 50(5) requires the information to be clear, distinguishable and given at the latest at the first interaction.',
    family: 'transparency',
    severity: 'high',
    weight: 8,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(50, '(1)', 'Transparency obligations — interaction with natural persons'),
      aiActArticle(50, '(5)', 'Transparency obligations — manner and timing of disclosure'),
      aiActArticle(99, '(4)(g)', 'Penalties — EUR 15 000 000 or 3 % of worldwide annual turnover'),
    ],
    appliesWhen: allOf(whenSignal('domain.chat.enduser'), whenProvider),
    evaluate: (ctx) => {
      const disclosure = ctx.signals.get('transparency.ai-disclosure');
      if (disclosure && disclosure.hits > 0) {
        const inUi = disclosure.evidence.some((e) => /\.(tsx|jsx|vue|svelte|html)$/i.test(e.path));
        if (inUi) {
          return satisfied(
            'An AI disclosure string was found in user-facing interface code.',
            disclosure.evidence.slice(0, 4),
          );
        }
        return partial(
          'An AI disclosure string exists, but only outside the user interface layer.',
          'Article 50(5) requires the notice to reach the user in a clear and distinguishable manner at first interaction. Render it above the conversation, not inside a README or a system prompt.',
          disclosure.evidence.slice(0, 4),
        );
      }
      return missing(
        'This system talks directly to people and no AI disclosure was found anywhere in the codebase.',
        'Show a persistent, clearly distinguishable notice at the start of every conversation stating that the user is interacting with an AI system. In force since 2 August 2026; exposure is EUR 15 000 000 or 3 % of worldwide annual turnover.',
        ['"you are chatting with an AI"', 'AI disclosure banner', 'aiDisclosure component'],
      );
    },
    remediation: {
      summary: 'Add an Article 50(1) disclosure module and render it at the top of the conversation.',
      reviewerNote:
        'Wire aiDisclosureBanner() into your chat layout above the message list. It must be visible before the first model turn, not dismissible on first load, and announced to screen readers.',
      effort: 'minutes',
      files: (ctx) => {
        const lang = primaryLanguage(ctx);
        return [
          {
            path: lang === 'python' ? 'ai_act/disclosure.py' : 'lib/ai-act/disclosure.ts',
            contents: disclosureModule(lang),
            createOnly: true,
            description: 'Article 50(1) disclosure text in EN/DE/FR plus an accessible banner helper.',
          },
        ];
      },
    },
    tests: [
      {
        name: 'missing when a chat UI has no disclosure',
        files: {
          'src/Chat.tsx':
            "import { useChat } from 'ai/react';\nexport function ChatWindow() {\n  const { messages } = useChat();\n  return <MessageList messages={messages} />;\n}\n",
          'src/api.ts':
            "import OpenAI from 'openai';\nconst client = new OpenAI();\nexport const reply = (m) => client.chat.completions.create({ model: 'gpt-4o', messages: m });\n",
        },
        expect: 'missing',
      },
      {
        name: 'satisfied when the UI discloses',
        files: {
          'src/Chat.tsx':
            "import { useChat } from 'ai/react';\nexport function ChatWindow() {\n  const { messages } = useChat();\n  return (<><p role=\"status\">You are chatting with an AI assistant, not a human.</p><MessageList messages={messages} /></>);\n}\n",
          'src/api.ts':
            "import OpenAI from 'openai';\nconst client = new OpenAI();\nexport const reply = (m) => client.chat.completions.create({ model: 'gpt-4o', messages: m });\n",
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art50.2.content-marking',
    penaltyTier: 'art99-4',
    requiresWiring: true,
    title: 'Mark synthetic output in a machine-readable format',
    obligation:
      'Article 50(2) requires providers of AI systems generating synthetic audio, image, video or text to ensure outputs are marked in a machine-readable format and detectable as artificially generated or manipulated. Systems already on the market before 2 August 2026 have until 2 December 2026 under Article 111(4).',
    family: 'transparency',
    severity: 'high',
    weight: 8,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(50, '(2)', 'Transparency obligations — machine-readable marking of synthetic content'),
      aiActArticle(111, '(4)', 'Transitional provision — marking deadline of 2 December 2026'),
    ],
    appliesWhen: allOf(anyOf(whenSignal('domain.synthetic.content'), whenFinding('art50.2.generated-text')), whenProvider),
    evaluate: (ctx) => {
      const marking = ctx.signals.get('transparency.content.marking');
      if (marking && marking.hits > 0) {
        const machineReadable = marking.evidence.some((e) =>
          /c2pa|content[_\s-]?credentials|provenance|manifest|synthid|metadata/i.test(e.snippet),
        );
        return machineReadable
          ? satisfied(
              'Machine-readable provenance marking was found on the generation path.',
              marking.evidence.slice(0, 4),
            )
          : partial(
              'A watermark reference exists, but nothing indicates a machine-readable provenance manifest.',
              'Article 50(2) requires the marking to be machine readable and detectable — a visible badge alone does not satisfy it. Attach C2PA Content Credentials for media, or a provenance manifest for text.',
              marking.evidence.slice(0, 4),
            );
      }
      return missing(
        'This system generates synthetic content and no machine-readable marking was found.',
        'Attach a provenance manifest to every generated artefact (C2PA Content Credentials for image, audio and video). A visible "AI-generated" label is not enough: the statutory test is machine readability.',
        ['C2PA', 'content credentials', 'provenance manifest', 'watermark'],
      );
    },
    remediation: {
      summary: 'Add an Article 50(2) provenance manifest builder for generated content.',
      reviewerNote:
        'Call markText() (or attach C2PA Content Credentials for media) on every generation path, and serve the manifest in a response header or sidecar field.',
      effort: 'hours',
      files: (ctx) => {
        const lang = primaryLanguage(ctx);
        return [
          {
            path: lang === 'python' ? 'ai_act/content_marking.py' : 'lib/ai-act/content-marking.ts',
            contents: contentMarkingModule(lang),
            createOnly: true,
            description: 'Machine-readable provenance manifest for synthetic content.',
          },
        ];
      },
    },
    tests: [
      {
        name: 'missing when synthetic text is generated with no provenance marking',
        files: {
          'src/generate.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nconst systemPrompt = "You write marketing copy.";\nexport async function generateCopy(brief) {\n  const completion = await client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: brief }] });\n  return completion.choices[0].message.content;\n}\n',
        },
        expect: 'missing',
      },
      {
        // The statutory test is machine readability, not visibility. A badge in
        // the UI is a design decision; a manifest is the obligation.
        name: 'partial when a visible watermark exists but nothing machine-readable does',
        files: {
          'src/generate.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nconst systemPrompt = "You write marketing copy.";\nexport async function generateCopy(brief) {\n  const completion = await client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: brief }] });\n  return completion.choices[0].message.content;\n}\n',
          'src/label.ts':
            'export const AI_BADGE = "AI-generated";\nexport function watermark(text) {\n  return AI_BADGE + ": " + text;\n}\n',
        },
        expect: 'partial',
      },
      {
        name: 'satisfied when a C2PA provenance manifest is attached to the output',
        files: {
          'src/generate.ts':
            'import OpenAI from "openai";\nconst client = new OpenAI();\nconst systemPrompt = "You write marketing copy.";\nexport async function generateCopy(brief) {\n  const completion = await client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: brief }] });\n  return completion.choices[0].message.content;\n}\n',
          'src/provenance.ts':
            'export function attachContentCredentials(asset) {\n  return { ...asset, c2pa: { manifest: buildProvenanceManifest(asset), claim_generator: "acme/1.0" } };\n}\n',
          'src/publish.ts':
            'import { generateCopy } from "./generate";\nimport { attachContentCredentials } from "./provenance";\n\nexport async function publish(brief) {\n  const copy = await generateCopy(brief);\n  return attachContentCredentials({ body: copy });\n}\n',
        },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art50.3.biometric-notification',
    penaltyTier: 'art99-4',
    title: 'Notify people exposed to emotion recognition or biometric categorisation',
    obligation:
      'Article 50(3) requires deployers of an emotion recognition system or a biometric categorisation system to inform the natural persons exposed to it of the operation of the system, and to process personal data in accordance with the GDPR.',
    family: 'transparency',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [aiActArticle(50, '(3)', 'Transparency obligations — emotion recognition and biometric categorisation')],
    // Article 50(3) is a *deployer* duty — it is the operator of the system who
    // informs the people exposed to it, not the party that built it.
    appliesWhen: allOf(whenSignal('domain.emotion.recognition', 'domain.biometric.categorisation'), whenDeployer),
    evaluate: (ctx) => {
      const notified = ctx.signals.hasAny('transparency.ai-disclosure', 'data.consent');
      const ev = evidenceFrom(ctx, 'transparency.ai-disclosure', 'data.consent');
      return notified
        ? partial(
            'A disclosure or consent mechanism exists in the codebase.',
            'Confirm the notice specifically tells exposed persons that an emotion recognition or biometric categorisation system is operating, before exposure. A generic privacy notice does not satisfy Article 50(3).',
            ev,
          )
        : missing(
            'An emotion recognition or biometric categorisation capability was detected with no notification to the people exposed to it.',
            'Inform exposed persons of the operation of the system before they are exposed, and record the GDPR lawful basis for processing the biometric data.',
            ['exposure notice', 'consent capture for biometric processing'],
          );
    },
  }),
  c({
    id: 'eu-ai-act.art50.4.deepfake-labelling',
    penaltyTier: 'art99-4',
    title: 'Disclose deep fakes and AI-written public-interest text',
    obligation:
      'Article 50(4) requires deployers of systems generating or manipulating image, audio or video constituting a deep fake to disclose that the content is artificially generated or manipulated, and deployers generating text published to inform the public on matters of public interest to disclose the same — unless the text underwent human review and a person holds editorial responsibility.',
    family: 'transparency',
    severity: 'medium',
    weight: 5,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [aiActArticle(50, '(4)', 'Transparency obligations — deep fakes and public-interest text')],
    // Article 50(4) likewise binds the deployer who publishes the deep fake or
    // the public-interest text, not the provider of the generator.
    appliesWhen: allOf(whenSignal('domain.synthetic.content'), whenDeployer),
    evaluate: (ctx) => {
      const labelled = ctx.signals.hasAny('transparency.ai-disclosure', 'transparency.content.marking');
      const ev = evidenceFrom(ctx, 'transparency.ai-disclosure', 'transparency.content.marking');
      return labelled
        ? satisfied('A disclosure or labelling mechanism was found on the generation path.', ev)
        : missing(
            'Generated media or text is produced with no visible disclosure to the audience.',
            'Label generated media as artificially generated where it depicts real people, places or events. For an evidently artistic, creative, satirical or fictional work, Article 50(4) reduces this to disclosing the existence of such content in a way that does not hamper enjoyment of the work.',
            ['AI-generated label', 'deepfake disclosure'],
          );
    },
  }),
  c({
    id: 'eu-ai-act.art3.role-determination',
    title: 'Determine and record whether you are the provider or the deployer',
    obligation:
      'Article 3(3) makes whoever develops an AI system and places it on the market or puts it into service under their own name or trademark the provider; Article 3(4) makes whoever uses one under their own authority the deployer. The distinction decides which Article 50 transparency duty binds you today — 50(1) and 50(2) fall on providers, 50(4) on deployers — and, from 2 December 2027, whether the Chapter III provider stack attaches at all.',
    family: 'documentation',
    severity: 'high',
    weight: 5,
    method: 'documentation',
    // Anchored to Article 50, which is in force. The Chapter III consequences
    // of the same determination (Arts. 16 and 25) sit in Section 3 and are
    // deferred with the rest of the high-risk regime by Art. 113 as amended.
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(3, '(3)', "Definitions — 'provider'"),
      aiActArticle(3, '(4)', "Definitions — 'deployer'"),
      aiActArticle(50, '', 'Transparency obligations — allocated by role'),
    ],
    appliesWhen: allOf(whenAiPresent, whenSignal('ai.provider.*')),
    evaluate: (ctx) => {
      const documented = ctx.grepDocs(
        /\b(provider|deployer)\b[\s\S]{0,80}\b(ai act|2024\/1689|article 25|art\.? 25)/i,
        3,
      );
      if (documented.length > 0) {
        return satisfied('The repository records its role under the AI Act in writing.', documented);
      }
      // Deliberately not a verdict. Article 3(3) turns on two facts Annex
      // cannot read out of a repository — whether the system is placed on the
      // market or put into service, and whether that happens under this
      // organisation's own name. Code can show that a model is called and a
      // product is built around it; only the organisation knows the rest.
      return needsReview(
        'This repository calls a third-party model and builds a product around the result. If that product is placed on the market or put into service under your own name or trademark, Article 3(3) makes you its provider rather than merely a deployer — and Annex cannot settle that from source code alone.',
        'Record the determination in writing, with the reasoning: who places the system on the market, under whose name, and whether it is supplied to third parties or put into service for your own use — Article 3(11) covers both, so deploying under your own name internally still makes you the provider. If you repoint a general-purpose AI system at an Annex III use case you may become the provider under Article 25(1)(c) even without developing it. Then check whether your model vendor has specified that its system is "not to be changed into a high-risk AI system": that switches off the Article 25(2) duty to hand you the documentation you would need for Annex IV.',
        evidenceFrom(
          ctx,
          'ai.provider.openai',
          'ai.provider.anthropic',
          'ai.provider.google',
          'ai.provider.cloud',
          'ai.provider.openweights',
        ),
      );
    },
  }),
];

// ===========================================================================
// Chapter III — high-risk requirements. Annex III systems: 2 December 2027.
// ===========================================================================

const highRiskControls: Control[] = [
  c({
    id: 'eu-ai-act.art9.risk-management',
    penaltyTier: 'art99-4',
    title: 'Risk management system across the lifecycle',
    obligation:
      'Article 9 requires a documented, continuous and iterative risk management system run throughout the lifecycle: identify and analyse risks under the intended purpose and reasonably foreseeable misuse, evaluate risks from post-market monitoring, adopt targeted measures, and judge residual risk acceptable.',
    family: 'risk-management',
    severity: 'critical',
    weight: 9,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [aiActArticle(9, '', 'Risk management system'), aiActAnnex('IV', '5', 'Technical documentation — risk management system')],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const docs = ctx.grepDocs(/\brisk\s+(register|assessment|management|matrix)\b/i, 5, DOC_SCOPES.risk);
      const residual = ctx.grepDocs(/\bresidual\s+risk\b/i, 2, DOC_SCOPES.risk);
      if (docs.length > 0 && residual.length > 0) {
        return satisfied('A risk register with an explicit residual-risk judgement was found.', [...docs.slice(0, 3), ...residual]);
      }
      if (docs.length > 0) {
        return partial(
          'Risk documentation exists, but no explicit residual-risk acceptance was found.',
          'Article 9(5) requires residual risk to be judged acceptable for each individual hazard and overall, by a named accountable person. Add that judgement and the date it was made.',
          docs.slice(0, 4),
        );
      }
      return missing(
        'No risk management documentation was found for a high-risk system.',
        'Establish a risk register covering risks under the intended purpose and under reasonably foreseeable misuse, the measures adopted, and the residual-risk acceptance.',
        ['risk register', 'risk assessment', 'residual risk'],
      );
    },
    remediation: {
      summary: 'Scaffold the Article 9 risk management system from the risks the scan already identified.',
      reviewerNote:
        'The risk table is pre-populated with the hazards implied by your classification. Fill in likelihood, severity and the accountable owner — those are judgements, not facts a scanner can supply.',
      effort: 'hours',
      files: (ctx) => [
        {
          path: 'docs/ai-act/risk-management.md',
          contents: riskManagementDoc(ctx),
          createOnly: true,
          description: 'Article 9 risk management system, pre-populated from scan findings.',
        },
      ],
    },
    tests: [
      {
        name: 'missing when nothing documents a risk management system',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        // The attack this fixture exists for: a README of compliance phrases,
        // no code change, three obligations green. A document is entitled to
        // answer a duty when its name is on topic or the match sits under an
        // on-topic heading — not because it contains the words.
        name: 'missing when a README merely mentions risk management in passing',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'README.md':
            '# Screener\n\n## About\n\nWe take compliance seriously. Our risk management process is mature and the risk register is reviewed quarterly. Residual risk is judged acceptable by the VP Engineering.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        name: 'satisfied when a README carries a risk management section',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'README.md':
            '# Screener\n\n## Risk management\n\nWe run a documented risk register across the lifecycle, reviewed quarterly. Residual risk is judged acceptable for each hazard and overall by the VP Engineering, who is the accountable person, most recently on 2026-08-14.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
      {
        name: 'satisfied when the document is named for the duty it answers',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'docs/risk-management.md':
            '# Risk management system (Article 9)\n\nA documented, continuous risk register covering the lifecycle.\n\nResidual risk is judged acceptable for each hazard and overall by the VP Engineering, on 2026-08-14.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
      {
        // The third way of faking a closed control, and the one that survived
        // longest: a correctly named document, under a correctly named
        // heading, whose sentences say the measure does not exist. Every
        // keyword the detector wants is present and the reading is still
        // wrong. A judge found this in five minutes.
        name: 'partial when the risk-management document says there is no risk management system',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'docs/risk-management.md':
            '# Risk management\n\nWe have no risk management system. We have not performed any residual risk acceptance. This document exists only so the scanner finds the words residual risk accepted and risk register.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
      {
        // The guard has to leave real documentation alone, and real
        // conformity documentation is full of legitimate negation. Nothing
        // here denies the measure; it qualifies it.
        name: 'satisfied when the document negates things other than the measure itself',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'docs/risk-management.md':
            '# Risk management system (Article 9)\n\nA documented, continuous risk register covering the lifecycle. A score is a prioritisation signal, not a verdict, and is never a final rejection.\n\nResidual risk is judged acceptable for each hazard and overall by the VP Engineering, on 2026-08-14. No hazard is closed without a named owner.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art10.bias-examination',
    penaltyTier: 'art99-4',
    title: 'Examine training and evaluation data for bias',
    obligation:
      'Article 10(2)(f) requires examination in view of possible biases likely to affect health and safety, negatively impact fundamental rights, or lead to discrimination prohibited under Union law — especially where outputs influence inputs for future operations. Article 10(2)(g) requires measures to detect, prevent and mitigate them.',
    family: 'data-governance',
    severity: 'critical',
    weight: 9,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(10, '(2)(f)', 'Data and data governance — examination for possible biases'),
      aiActArticle(10, '(2)(g)', 'Data and data governance — bias mitigation measures'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const testing = ctx.signals.get('data.bias.testing');
      if (testing && testing.hits >= 2) {
        return satisfied('Bias or fairness testing was found in the codebase.', testing.evidence.slice(0, 5));
      }
      if (testing && testing.hits === 1) {
        return partial(
          'A single reference to bias or fairness testing was found.',
          'One mention is not an examination. Article 10(2)(f) expects a repeatable measurement across the groups the system is used on, with results retained under Annex IV(2)(g).',
          testing.evidence,
        );
      }
      const protectedAttrs = ctx.signals.get('data.special-category');
      const note = protectedAttrs && protectedAttrs.hits > 0
        ? ' Protected attributes were found in the data model, which raises the stakes: they can be used to measure disparity, or to cause it.'
        : ' Note that proxies such as postcode, school or name can encode protected characteristics without appearing in the schema.';
      return missing(
        `No bias or fairness testing was found for a high-risk system.${note}`,
        'Add a measurement that computes outcome rates per protected group and an impact ratio, run it on every release, and retain the results. Article 10(2)(f) cannot be satisfied by assertion.',
        ['disparate impact', 'demographic parity', 'impact ratio', 'fairlearn', 'aequitas'],
      );
    },
    tests: [
      {
        name: 'satisfied with a fairness harness',
        files: {
          'evals/fairness.py':
            'from fairlearn.metrics import demographic_parity_difference\n\ndef selection_rate_by_group(df):\n    return df.groupby("group").outcome.mean()\n',
          'evals/bias_report.py': 'def impact_ratio(rates):\n    return rates / rates.max()\n',
          'src/screen.py': 'def rank_candidates(applicants):\n    return sorted(applicants, key=resume_score)\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art10.data-governance',
    penaltyTier: 'art99-4',
    title: 'Document data provenance and preparation',
    obligation:
      'Article 10(2)(b)-(e) requires documented data collection processes and the origin of the data — including, for personal data, the original purpose of collection — data preparation operations, the assumptions the data encodes, and an assessment of availability, quantity and suitability.',
    family: 'data-governance',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(10, '(2)', 'Data and data governance — governance practices'),
      aiActAnnex('IV', '2(d)', 'Technical documentation — datasheets'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const docs = ctx.grepDocs(
        /\b(data|dataset)[\s-]?(card|sheet|provenance|lineage|source|governance)\b|^#+\s*(training data|data ?sources?|datasets?)/im,
        5,
        DOC_SCOPES.data,
      );
      return docs.length > 0
        ? satisfied('Dataset documentation was found.', docs.slice(0, 4))
        : missing(
            'No dataset documentation was found.',
            'Write a datasheet for each training, validation and testing dataset: where it came from, how it was selected and labelled, what it is assumed to represent, and what is missing from it.',
            ['dataset card', 'datasheet', 'data provenance', 'training data documentation'],
          );
    },
    remediation: {
      summary: 'Scaffold the Article 10 data governance record against all eight statutory points.',
      reviewerNote: 'Each heading maps to one lettered point of Article 10(2). Do not delete headings you cannot answer — record why they do not apply.',
      effort: 'hours',
      files: (ctx) => [
        {
          path: 'docs/ai-act/data-governance.md',
          contents: dataGovernanceDoc(ctx),
          createOnly: true,
          description: 'Article 10(2)(a)-(h) data governance record.',
        },
      ],
    },
  }),
  c({
    id: 'eu-ai-act.art11.technical-documentation',
    penaltyTier: 'art99-4',
    title: 'Annex IV technical documentation exists and is current',
    obligation:
      'Article 11(1) requires technical documentation to be drawn up before the system is placed on the market and kept up to date, containing at least the elements set out in Annex IV. SMEs, start-ups and small mid-caps may provide it in simplified form.',
    family: 'documentation',
    severity: 'critical',
    weight: 9,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(11, '(1)', 'Technical documentation'),
      aiActAnnex('IV', '', 'Technical documentation referred to in Article 11(1)'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const doc = ctx.findFile(/annex[-_\s]?iv|technical[-_\s]?documentation/i);
      if (doc) {
        const hasAllPoints = /point\s*9|post-market monitoring plan/i.test(doc.text);
        return hasAllPoints
          ? satisfied('Annex IV technical documentation was found in the repository.', [
              { path: doc.path, line: 1, snippet: doc.path, fileSha256: doc.sha256, kind: 'doc' },
            ])
          : partial(
              'A technical documentation file exists but does not cover all nine Annex IV points.',
              'Annex IV point 9 requires the post-market monitoring plan to be embedded in the technical documentation. Complete the missing points.',
              [{ path: doc.path, line: 1, snippet: doc.path, fileSha256: doc.sha256, kind: 'doc' }],
            );
      }
      return missing(
        'No Annex IV technical documentation was found.',
        `Generate the dossier. Annex produces a complete Annex IV skeleton at ${ANNEX_IV_DOC}, populated from the evidence in this scan, with every unanswerable point marked TODO rather than invented.`,
        ['Annex IV', 'technical documentation'],
      );
    },
  }),
  c({
    id: 'eu-ai-act.art12.record-keeping',
    penaltyTier: 'art99-4',
    requiresWiring: true,
    title: 'Automatic logging of events over the system lifetime',
    obligation:
      'Article 12(1) requires high-risk AI systems to technically allow the automatic recording of events over their lifetime. Article 12(2) requires logging that enables identification of situations that may result in an Article 79(1) risk or a substantial modification, and that facilitates post-market monitoring.',
    family: 'record-keeping',
    severity: 'critical',
    weight: 9,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(12, '(1)', 'Record-keeping — automatic logging'),
      aiActArticle(12, '(2)', 'Record-keeping — what the logs must enable'),
      aiActArticle(21, '(2)', 'Cooperation — access to logs on reasoned request'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const inference = ctx.signals.get('control.logging.inference');
      const versioned = ctx.signals.hasAny('control.model.version');
      const traceable = ctx.signals.hasAny('control.traceability.id');

      if (!inference || inference.hits === 0) {
        const generic = ctx.signals.get('control.logging.structured');
        return missing(
          generic && generic.hits > 0
            ? 'Structured application logging exists, but nothing records the model inputs, outputs and versions behind each decision. Application logs are not Article 12 logs.'
            : 'No inference logging was found. A high-risk system that cannot reproduce why it decided what it decided cannot demonstrate Article 12 conformity.',
          'Record every inference: a decision identifier, the model and prompt version, digests of input and output, the outcome, the confidence, and who reviewed it.',
          ['audit log', 'inference log', 'decision log'],
        );
      }
      if (versioned && traceable) {
        // Article 12(1) requires logs to be recorded *while the system is in
        // use*, so a recorder nothing calls records nothing — which the engine
        // invariant enforces for every control, this one included.
        return satisfied('Inference logging was found, carrying both a model version and a traceable identifier.', [
          ...inference.evidence.slice(0, 3),
          ...ctx.signals.evidenceFor('control.model.version').slice(0, 2),
        ]);
      }
      return partial(
        'Inference logging exists, but it does not consistently carry the model version and a per-decision identifier.',
        'Without a pinned model version and a decision identifier, a log cannot tie an outcome to the system state that produced it — which is the whole point of Article 12(2)(a).',
        inference.evidence.slice(0, 4),
      );
    },
    remediation: {
      summary: 'Add an Article 12 inference audit log with digest-based input capture.',
      reviewerNote:
        'Call recordInference() on every model call that can affect a person, and point the sink at durable storage. Inputs are hashed rather than stored, which keeps GDPR Art. 5(1)(c) data minimisation intact while still proving which input produced which output.',
      effort: 'hours',
      files: (ctx) => {
        const lang = primaryLanguage(ctx);
        return [
          {
            path: lang === 'python' ? 'ai_act/audit_log.py' : 'lib/ai-act/audit-log.ts',
            contents: auditLogModule(lang),
            createOnly: true,
            description: 'Article 12 automatic record-keeping with a 190-day retention default.',
          },
        ];
      },
    },
    tests: [
      {
        name: 'missing when only console logging exists',
        files: {
          'src/rank.ts':
            "import OpenAI from 'openai';\nconst c = new OpenAI();\nexport async function rankCandidate(cv: string) {\n  const r = await c.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: cv }] });\n  console.log('done');\n  return r;\n}\n",
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art19.log-retention',
    penaltyTier: 'art99-4',
    title: 'Retain automatically generated logs for at least six months',
    obligation:
      'Article 19(1) requires providers to keep the logs automatically generated by their high-risk AI systems, to the extent those logs are under their control, for a period appropriate to the intended purpose and of at least six months, unless Union or national law provides otherwise.',
    family: 'record-keeping',
    severity: 'high',
    weight: 5,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [aiActArticle(19, '(1)', 'Automatically generated logs — six-month floor')],
    appliesWhen: allOf(whenHighRisk, whenSignal('control.logging.inference')),
    evaluate: (ctx) => {
      const retention = ctx.signals.get('control.logging.retention');
      if (!retention || retention.hits === 0) {
        return missing(
          'Logs are produced but no retention period is declared anywhere in the codebase.',
          'Declare a retention period of at least six months (Article 19(1)) and enforce it in the storage layer. An undeclared retention period is indistinguishable from a 24-hour one under audit.',
          ['retention period', 'RETENTION_DAYS', 'log TTL'],
        );
      }
      // The window can be written either way round:
      //   RETENTION_DAYS = 30      |  retention: '30 days'
      const numbers = retention.evidence
        .flatMap((e) => [
          /(\d{1,5})\s*(?:days?\b|d\b)/i.exec(e.snippet)?.[1],
          /\b(?:retention|retain)\w*[_\s]?days?\b[^\d]{0,12}(\d{1,5})/i.exec(e.snippet)?.[1],
          /\b(?:retention|retain)\w*\s*[:=]\s*(\d{1,5})\b/i.exec(e.snippet)?.[1],
        ])
        .filter((n): n is string => Boolean(n))
        .map(Number)
        .filter((n) => n > 0);
      const shortest = numbers.length ? Math.min(...numbers) : undefined;
      // Six months. Use one number for the test and the message; 180 in the
      // predicate and 183 in the prose let a 181-day window pass while the
      // document said it should not.
      if (shortest !== undefined && shortest < 183) {
        return {
          status: 'missing',
          finding: `A retention period of ${shortest} days was found. Article 19(1) sets a floor of six months, which is about 183 days.`,
          gap: `Article 19(1) says six calendar months, not a day count, so a window within a few days of 183 is a judgement rather than a breach — but ${shortest} days is below any reading of it. Raise it to 183 days and the question does not arise.`,
          evidence: retention.evidence.slice(0, 3),
        };
      }
      return satisfied('A log retention period meeting the six-month floor was declared.', retention.evidence.slice(0, 3));
    },
  }),
  c({
    id: 'eu-ai-act.art13.instructions-for-use',
    penaltyTier: 'art99-4',
    title: 'Instructions for use for deployers',
    obligation:
      'Article 13(2)-(3) requires high-risk systems to be accompanied by concise, complete, correct and clear instructions for use covering provider identity, capabilities and limitations, declared accuracy metrics, foreseeable misuse, explanation capabilities, subgroup performance, input specifications, pre-determined changes, human oversight measures, resource needs and how the deployer reads the logs.',
    family: 'transparency',
    severity: 'high',
    weight: 7,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [aiActArticle(13, '(3)', 'Transparency and provision of information to deployers')],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const instructions = ctx.signals.get('transparency.instructions');
      const limitations = ctx.grepDocs(/^#+\s*(limitations|known issues|out[- ]of[- ]scope)/im, 3, DOC_SCOPES.limitations);
      if (instructions && instructions.hits > 0 && limitations.length > 0) {
        return satisfied('Deployer-facing instructions including a limitations section were found.', [
          ...instructions.evidence.slice(0, 3),
          ...limitations.slice(0, 2),
        ]);
      }
      if (instructions && instructions.hits > 0) {
        return partial(
          'Deployer documentation exists but states no limitations.',
          'Article 13(3)(b)(ii)-(v) requires declared accuracy metrics, the circumstances that degrade them, and performance on specific groups. A document that only describes success does not satisfy it.',
          instructions.evidence.slice(0, 4),
        );
      }
      return missing(
        'No instructions for use aimed at a deployer were found.',
        'Write the instructions against Article 13(3)(a)-(f), including the seven romanettes of (b). The hardest and most important is (b)(v): accuracy for specific persons or groups, not just overall.',
        ['instructions for use', 'intended purpose', 'limitations'],
      );
    },
    remediation: {
      summary: 'Scaffold Article 13 instructions for use against Article 13(3)(a)-(f) and the seven romanettes of (b).',
      reviewerNote: 'Section (b)(v) — performance for specific groups — is the one auditors read first. It cannot be left as TODO in a final version.',
      effort: 'hours',
      files: (ctx) => [
        {
          path: 'docs/ai-act/instructions-for-use.md',
          contents: instructionsForUseDoc(ctx),
          createOnly: true,
          description: 'Article 13(3) instructions for use.',
        },
      ],
    },
  }),
  c({
    id: 'eu-ai-act.art14.human-oversight',
    penaltyTier: 'art99-4',
    requiresWiring: true,
    title: 'Effective human oversight while the system is in use',
    obligation:
      'Article 14 requires high-risk systems to be designed so they can be effectively overseen by natural persons, who must be able to understand capacities and limitations, remain aware of automation bias, correctly interpret output, decide not to use the system or disregard, override or reverse its output, and intervene or interrupt it.',
    family: 'human-oversight',
    severity: 'critical',
    weight: 10,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(14, '(1)', 'Human oversight'),
      aiActArticle(14, '(4)(d)', 'Human oversight — disregard, override or reverse the output'),
      aiActArticle(14, '(4)(e)', "Human oversight — 'stop' button or similar procedure"),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const review = ctx.signals.hasAny('control.human.review');
      const override = ctx.signals.hasAny('control.override');
      const stop = ctx.signals.hasAny('control.killswitch');
      const autonomous = ctx.signals.hasAny('domain.automated.decision', 'ai.autonomy.tooluse');
      const ev = evidenceFrom(ctx, 'control.human.review', 'control.override', 'control.killswitch');

      const present = [review && 'a human review step', override && 'an override path', stop && 'a stop control'].filter(
        Boolean,
      ) as string[];
      const absent = [
        !review && 'a human review step (Art. 14(4)(d))',
        !override && 'an override path (Art. 14(4)(d))',
        !stop && 'a stop control (Art. 14(4)(e))',
      ].filter(Boolean) as string[];

      if (present.length === 3) {
        // Existence is not oversight — but that is the engine's invariant, not
        // this control's business. `evaluateControl` caps a `satisfied` verdict
        // at `partial` when the code behind it is unreached, and cites the call
        // site when it is.
        return satisfied(`All three oversight affordances were found: ${present.join(', ')}.`, ev);
      }
      if (present.length === 0) {
        return missing(
          autonomous
            ? 'This system applies automated outcomes to people with no human review, no override path and no stop control.'
            : 'No human oversight affordances were found.',
          `Implement ${absent.join(', ')}. Article 14 is the requirement auditors probe first, because it is the one that decides whether a wrong output becomes a wrong decision.`,
          ['human review', 'override', 'kill switch', 'feature flag'],
        );
      }
      return partial(
        `Partial oversight: found ${present.join(' and ')}.`,
        `Still missing ${absent.join(' and ')}.`,
        ev,
      );
    },
    remediation: {
      summary: 'Add an Article 14 oversight gate covering review, override and the stop control.',
      reviewerNote:
        'Route every consequential outcome through gate(). Adverse outcomes never auto-apply; low-confidence outcomes escalate; AI_ENABLED=false halts the system in a safe state.',
      effort: 'hours',
      files: (ctx) => {
        const lang = primaryLanguage(ctx);
        return [
          {
            path: lang === 'python' ? 'ai_act/human_oversight.py' : 'lib/ai-act/human-oversight.ts',
            contents: humanOversightModule(lang),
            createOnly: true,
            description: 'Article 14(4)(b), (d) and (e) oversight gate.',
          },
        ];
      },
    },
    tests: [
      {
        name: 'missing when nothing gates the decision',
        files: {
          'src/decide.py':
            'def decide(applicant):\n    score = model.predict(applicant)\n    if score < 0.4:\n        return "reject"\n    return "advance"\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        name: 'satisfied when all three affordances exist and the decision path calls them',
        files: {
          'src/decide.py':
            'import os\nfrom src.review import override_decision\n\nAI_ENABLED = os.getenv("AI_ENABLED") != "false"\n\ndef decide(applicant):\n    if not AI_ENABLED:\n        return "halted"\n    score = model.predict(applicant)\n    outcome = {"status": "pending_review", "human_review": True}\n    if score < 0.4:\n        override_decision(applicant["id"], None, "auto-escalated")\n    return outcome\n',
          'src/review.py':
            'def override_decision(decision_id, reviewer_id, reason):\n    """Human review: a reviewer can override the model output."""\n    return record_override(decision_id, reviewer_id, reason)\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
      {
        // The laundering case. An oversight module that exists and is never
        // called is the state Annex's own remediation PR leaves behind, and it
        // must not turn the highest-weight control in the corpus green.
        name: 'partial when the oversight module exists but nothing calls it',
        files: {
          'src/decide.py':
            'def decide(applicant):\n    score = model.predict(applicant)\n    if score < 0.4:\n        return "reject"\n    return "advance"\n',
          'ai_act/human_oversight.py':
            'import os\n\nAI_ENABLED = os.getenv("AI_ENABLED") != "false"\n\ndef gate(outcome):\n    """Human review gate: adverse outcomes never auto-apply."""\n    if not AI_ENABLED:\n        return "halted"\n    return {"status": "pending_review", "human_review": True}\n\ndef override_decision(decision_id, reviewer_id, reason):\n    """A reviewer can override or reverse the model output."""\n    return record_override(decision_id, reviewer_id, reason)\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
      {
        // One line of work — `import gate  # noqa: F401` — used to be enough
        // to turn this control green. An import is a declaration of intent;
        // Article 14 is about what happens at the decision.
        name: 'partial when the oversight module is imported but never called',
        files: {
          'src/decide.py':
            'from ai_act.human_oversight import gate  # noqa: F401\n\n\ndef decide(applicant):\n    score = model.predict(applicant)\n    if score < 0.4:\n        return "reject"\n    return "advance"\n',
          'ai_act/human_oversight.py':
            'import os\n\nAI_ENABLED = os.getenv("AI_ENABLED") != "false"\n\ndef gate(outcome):\n    """Human review gate: adverse outcomes never auto-apply."""\n    if not AI_ENABLED:\n        return "halted"\n    return {"status": "pending_review", "human_review": True}\n\ndef override_decision(decision_id, reviewer_id, reason):\n    """A reviewer can override or reverse the model output."""\n    return record_override(decision_id, reviewer_id, reason)\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art15.accuracy',
    penaltyTier: 'art99-4',
    title: 'Declared accuracy metrics measured against a fixed set',
    obligation:
      'Article 15(1) requires an appropriate level of accuracy, robustness and cybersecurity, consistent throughout the lifecycle. Article 15(3) requires the declared accuracy levels and the relevant accuracy metrics to be stated in the instructions for use.',
    family: 'accuracy-robustness',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(15, '(1)', 'Accuracy, robustness and cybersecurity'),
      aiActArticle(15, '(3)', 'Declared accuracy levels and metrics'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const evals = ctx.signals.get('quality.eval.suite');
      const declared = ctx.grepDocs(/\b(accuracy|precision|recall|f1|auc)\b[\s\S]{0,40}[\d.]+\s*%?/i, 3, DOC_SCOPES.accuracy);
      if (evals && evals.hits >= 2 && declared.length > 0) {
        return satisfied('An evaluation suite and declared accuracy figures were both found.', [
          ...evals.evidence.slice(0, 3),
          ...declared.slice(0, 2),
        ]);
      }
      if (evals && evals.hits > 0) {
        return partial(
          'Evaluation code exists, but no accuracy level is declared in documentation.',
          'Article 15(3) requires the declared accuracy level and its metric to appear in the instructions for use. Publish the number, not just the harness.',
          evals.evidence.slice(0, 4),
        );
      }
      return missing(
        'No model evaluation suite was found for a high-risk system.',
        'Build a fixed evaluation set with a declared metric and a threshold, run it on every release, and publish the result in the instructions for use.',
        ['eval suite', 'benchmark', 'ground truth', 'accuracy metric'],
      );
    },
    tests: [
      {
        name: 'missing when a high-risk system ships with no evaluation suite',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        // Article 15(3) wants the declared number in the instructions for use.
        // A harness that nobody publishes the output of is half the duty.
        name: 'partial when an eval harness exists but no accuracy level is published',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'evals/run.py':
            'GROUND_TRUTH = "evals/golden.jsonl"\n\n\ndef evaluate(model):\n    """Score the model against a fixed benchmark set."""\n    return {"precision": precision(model), "recall": recall(model), "f1": f1(model)}\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
      {
        name: 'satisfied once the declared accuracy level appears in the documentation',
        files: {
          'src/score.ts':
            'export function scoreApplicant(applicant) {\n  const resumeScore = model.predict(applicant.resume);\n  return { candidate: applicant.id, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'evals/run.py':
            'GROUND_TRUTH = "evals/golden.jsonl"\n\n\ndef evaluate(model):\n    """Score the model against a fixed benchmark set."""\n    return {"precision": precision(model), "recall": recall(model), "f1": f1(model)}\n',
          'docs/accuracy.md':
            '# Declared accuracy (Article 15(3))\n\nMetric: macro F1 on the frozen evaluation set of 4,200 labelled CVs.\n\nDeclared accuracy: 0.87 (87%). Measured 2026-08-30, re-measured on every release.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art15.cybersecurity',
    penaltyTier: 'art99-4',
    title: 'AI-specific cybersecurity measures',
    obligation:
      'Article 15(5) requires high-risk systems to be resilient against attempts by unauthorised third parties to alter their use, outputs or performance, with measures where appropriate to prevent, detect, respond to, resolve and control data poisoning, model poisoning, adversarial examples, model evasion and confidentiality attacks.',
    family: 'accuracy-robustness',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [aiActArticle(15, '(5)', 'Cybersecurity — AI-specific attack surface')],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const defence = ctx.signals.hasAny('security.prompt-injection');
      const redteam = ctx.signals.hasAny('security.redteam');
      const ev = evidenceFrom(ctx, 'security.prompt-injection', 'security.redteam');
      if (defence && redteam) return satisfied('Input defences and adversarial testing were both found.', ev);
      if (defence || redteam) {
        return partial(
          defence
            ? 'Input defences were found, but no adversarial or red-team testing.'
            : 'Adversarial testing was found, but no runtime input defences.',
          'Article 15(5) expects both: measures to prevent the attack and evidence that you tried to break them yourself.',
          ev,
        );
      }
      return missing(
        'No AI-specific security measures were found.',
        'Add input and output moderation on the model path, and an adversarial test suite covering prompt injection, jailbreaks and model evasion.',
        ['prompt injection defence', 'guardrails', 'red team', 'adversarial tests'],
      );
    },
  }),
  c({
    id: 'eu-ai-act.art17.quality-management',
    penaltyTier: 'art99-4',
    title: 'Quality management system',
    obligation:
      'Article 17 requires a documented quality management system covering, among thirteen aspects, the regulatory compliance strategy, design and development controls, examination and validation procedures and their frequency, data management, the risk management system, post-market monitoring, incident reporting procedures, record-keeping and an accountability framework. Implementation must be proportionate to the size of the organisation.',
    family: 'quality-management',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [aiActArticle(17, '(1)', 'Quality management system'), aiActArticle(17, '(2)', 'Proportionality for SMEs')],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const ci = ctx.signals.hasAny('governance.ci');
      const changeControl = ctx.signals.hasAny('governance.change-control');
      const tests = ctx.signals.hasAny('quality.test.suite');
      const standard = ctx.signals.hasAny('governance.qms');
      const found = [ci && 'a CI pipeline', changeControl && 'change control', tests && 'an automated test suite', standard && 'a named management standard'].filter(Boolean) as string[];
      const ev = evidenceFrom(ctx, 'governance.ci', 'governance.change-control', 'quality.test.suite', 'governance.qms');

      if (found.length >= 3) {
        return satisfied(
          `Engineering controls that evidence a quality management system were found: ${found.join(', ')}.`,
          ev,
        );
      }
      if (found.length > 0) {
        return partial(
          `Found ${found.join(' and ')}, which is a start on Article 17.`,
          'Article 17(1) asks for the compliance strategy, validation procedures and their frequency, and an accountability framework to be written down — not only implemented in tooling.',
          ev,
        );
      }
      return missing(
        'No quality management evidence was found: no CI pipeline, no change control, no test suite.',
        'Article 17(2) allows implementation proportionate to a start-up, but not absence. A CI pipeline, required review on the default branch and a test suite are the cheapest defensible baseline.',
        ['CI workflow', 'CODEOWNERS', 'test suite', 'ISO 42001'],
      );
    },
    remediation: {
      summary: 'Add a CI workflow that re-checks conformity on every change.',
      reviewerNote:
        'The workflow fails the build below a conformity floor, uploads findings to the Security tab as SARIF, and flags substantial modifications under Article 43(4) on pull requests.',
      effort: 'minutes',
      files: () => [
        {
          path: '.github/workflows/ai-act-conformity.yml',
          contents: ciWorkflow(),
          createOnly: true,
          description: 'Continuous conformity check with SARIF upload and drift detection.',
        },
      ],
    },
  }),
  c({
    id: 'eu-ai-act.art72.post-market-monitoring',
    // No penalty tier: Article 72 is a Chapter IX duty and is not among the
    // nine heads of Article 99(4). Penalised under the Member State rules
    // required by Article 99(1), without a stated Union ceiling.
    title: 'Post-market monitoring plan',
    obligation:
      'Article 72 requires a documented post-market monitoring system, proportionate to the risks, that actively and systematically collects and analyses data on performance throughout the lifetime of the system. Article 72(3) makes the monitoring plan part of the Annex IV technical documentation.',
    family: 'post-market',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(72, '(1)', 'Post-market monitoring by providers'),
      aiActAnnex('IV', '9', 'Technical documentation — post-market monitoring plan'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const plan = ctx.grepDocs(/post[\s-]?market\s+monitoring/i, 3, DOC_SCOPES.postMarket);
      const telemetry = ctx.signals.hasAny('quality.monitoring');
      if (plan.length > 0) return satisfied('A post-market monitoring plan was found.', plan);
      if (telemetry) {
        return partial(
          'Production monitoring exists in the codebase, but no post-market monitoring plan is documented.',
          'Article 72(3) requires a written plan, and Annex IV point 9 requires it to sit inside the technical documentation. Telemetry without a plan is not the same obligation.',
          evidenceFrom(ctx, 'quality.monitoring'),
        );
      }
      return missing(
        'Neither a post-market monitoring plan nor production monitoring was found.',
        `Define the signals you will collect once the system is live, the thresholds that trigger action, and who owns each one. ${TIMING_HEDGE}`,
        ['post-market monitoring plan', 'drift detection', 'production metrics'],
      );
    },
    remediation: {
      summary: 'Scaffold the Article 72 post-market monitoring plan.',
      reviewerNote:
        'The default impact-ratio threshold of 0.80 is the US four-fifths rule. The AI Act sets no number; adopting a published one is what makes the plan auditable.',
      effort: 'hours',
      files: (ctx) => [
        {
          path: 'docs/ai-act/post-market-monitoring.md',
          contents: postMarketMonitoringDoc(ctx),
          createOnly: true,
          description: 'Article 72(3) post-market monitoring plan.',
        },
      ],
    },
  }),
  c({
    id: 'eu-ai-act.art73.incident-reporting',
    // No penalty tier: Article 73 is a Chapter IX duty and is not among the
    // nine heads of Article 99(4). Penalised under the Member State rules
    // required by Article 99(1), without a stated Union ceiling.
    title: 'Serious incident reporting procedure',
    obligation:
      'Article 73 requires providers to report serious incidents to the market surveillance authority: within 2 days for a widespread infringement or an Article 3(49)(b) incident, within 10 days where a person has died, and in any event within 15 days otherwise. Article 73(6) forbids altering the system in a way that affects the later evaluation of causes before informing the authorities.',
    family: 'incident-response',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(73, '(2)', 'Reporting of serious incidents — 15-day default'),
      aiActArticle(73, '(3)', 'Reporting of serious incidents — 2 days'),
      aiActArticle(73, '(4)', 'Reporting of serious incidents — 10 days where a person has died'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const procedure = ctx.grepDocs(/\b(incident\s+(response|report\w*)|runbook|escalation|post[\s-]?mortem)\b/i, 4, DOC_SCOPES.incident);
      const deadlines = ctx.grepDocs(/\b(15\s*days?|2\s*days?|10\s*days?)\b[\s\S]{0,60}\b(report|authority|incident)/i, 2, DOC_SCOPES.incident);
      if (procedure.length > 0 && deadlines.length > 0) {
        return satisfied('An incident procedure naming the statutory reporting deadlines was found.', [
          ...procedure.slice(0, 3),
          ...deadlines,
        ]);
      }
      if (procedure.length > 0) {
        return partial(
          'An incident response process exists, but it does not name a regulator or the statutory deadlines.',
          'Add the market surveillance authority contact and the 2 / 10 / 15-day deadlines. An internal sev process that never reports outward does not satisfy Article 73.',
          procedure.slice(0, 4),
        );
      }
      return missing(
        'No serious incident reporting procedure was found.',
        `Write the procedure, name the authority, and start the clock at the moment of awareness rather than the moment of confirmation. ${TIMING_HEDGE}`,
        ['incident response', 'runbook', 'escalation policy'],
      );
    },
    remediation: {
      summary: 'Scaffold the Article 73 serious incident reporting procedure with the statutory deadlines.',
      reviewerNote: 'Fill in the market surveillance authority contact for your Member State and the escalation roster. Everything else is statutory and pre-filled.',
      effort: 'minutes',
      files: (ctx) => [
        {
          path: 'docs/ai-act/incident-reporting.md',
          contents: incidentResponseDoc(ctx),
          createOnly: true,
          description: 'Article 73 incident reporting procedure with the 2/10/15-day deadlines.',
        },
      ],
    },
  }),
  c({
    id: 'eu-ai-act.art49.registration',
    penaltyTier: 'art99-4',
    title: 'Registration in the EU database',
    obligation:
      'Article 49(1) requires the provider of an Annex III high-risk system (other than point 2) to register itself and the system in the EU database before placing it on the market. Article 49(2) requires the same registration even where the provider concludes under Article 6(3) that the system is not high-risk.',
    family: 'registration',
    severity: 'medium',
    weight: 4,
    method: 'documentation',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(49, '(1)', 'Registration of high-risk AI systems'),
      aiActArticle(49, '(2)', 'Registration where the provider claims the Article 6(3) derogation'),
      aiActArticle(6, '(4)', 'Documented assessment where a provider considers a system not high-risk'),
    ],
    appliesWhen: whenHighRiskOrDerogated,
    evaluate: (ctx) => {
      const ev = evidenceFrom(ctx, 'governance.registration');
      return ev.length > 0
        ? partial(
            'The repository references EU database registration or conformity assessment.',
            'Confirm the registration was actually completed and record the database entry identifier. A reference in documentation is not a registration.',
            ev,
          )
        : missing(
            'No reference to EU database registration was found.',
            `Register the system before placing it on the market. Note the trap in Article 49(2): concluding under Article 6(3) that your system is *not* high-risk does not exempt you — it still has to be registered, and the assessment has to be documented beforehand under Article 6(4). ${TIMING_HEDGE}`,
            ['EU database', 'Article 49', 'declaration of conformity', 'CE marking'],
          );
    },
  }),
  c({
    id: 'eu-ai-act.art26.deployer-obligations',
    penaltyTier: 'art99-4',
    title: 'Deployer duties: assigned overseers, input data, and telling the workforce',
    obligation:
      'Article 26 puts duties on the deployer, not the provider: use the system in accordance with the instructions for use (26(1)), assign human oversight to natural persons who have the necessary competence, training and authority and the support to exercise it (26(2)), ensure that input data is relevant and sufficiently representative for the intended purpose so far as the deployer controls it (26(4)), monitor operation and, where a risk under Article 79(1) arises, inform the provider and the market surveillance authority **and suspend use of the system** without undue delay (26(5)), keep the automatically generated logs for at least six months (26(6)), before putting a high-risk system into service at the workplace inform workers\' representatives and the affected workers that they will be subject to it (26(7)), and — for an Annex III system that makes or assists in making decisions about people — inform those people that they are subject to it (26(11)). A deployer that is a public authority must also comply with the Article 49 registration duty and must not use a system it finds is not registered (26(8)).',
    family: 'human-oversight',
    severity: 'high',
    weight: 7,
    method: 'static-analysis',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(26, '(2)', 'Obligations of deployers — assigned human oversight'),
      aiActArticle(26, '(4)', 'Obligations of deployers — input data'),
      aiActArticle(
        26,
        '(7)',
        'Obligations of deployers — informing workers',
        'Before putting into service or using a high-risk AI system at the workplace, deployers who are employers shall inform workers\' representatives and the affected workers that they will be subject to the use of the high-risk AI system',
      ),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const assigned = ctx.grep(/\b(assigned|designated|named)[_\s-]?(reviewer|overseer|approver|operator)\b|\breviewer[_\s-]?(role|id|assignment)\b/i, { limit: 3 });
      const workplace = ctx.signals.hasAny('domain.employment.screening', 'domain.employment.management');
      const informed = ctx.grepDocs(
        /\b(works[_\s]?council|workers['\u2019]? representatives?|employee[_\s]?representatives?|staff[_\s]?consultation|collective[_\s]?agreement)\b/i,
        3,
        /(worker|employee|staff|hr|works[-_]?council|deployer|instruction|readme)/i,
      );
      const ev = [...assigned, ...informed];

      if (workplace && informed.length === 0) {
        return missing(
          'This system makes decisions about people at work, and nothing records that workers or their representatives were informed before it was put into service.',
          'Article 26(7) is a duty on the employer and it is easy to miss because it sits outside the technical requirements: before a high-risk system is used at the workplace, the affected workers and their representatives have to be told. Record when, and to whom.',
          ['works council', "workers' representatives", 'staff consultation'],
        );
      }
      if (assigned.length > 0) {
        return partial(
          'An assigned reviewer role was found in the code.',
          'Article 26(2) asks for more than a role: the person must have the competence, the training, the authority and the organisational support to exercise oversight. That is a personnel record, not a database column, and Annex cannot see it.',
          ev,
        );
      }
      return needsReview(
        'Article 26 binds whoever deploys this system, which may not be whoever wrote this repository.',
        'If you deploy it: assign oversight to named people with the authority to act on it, keep the logs for six months under Article 26(6), check that the input data you control is representative, and — at the workplace — inform the affected workers first. If you only supply it, record that Article 26 falls on your customers and give them what Article 13 requires to discharge it.',
        ev,
      );
    },
    tests: [
      {
        // Article 26(7) is the duty deployers miss, because it has no
        // engineering task attached to it: you tell the workforce first.
        name: 'missing when a workplace system has no record of informing workers',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, job_requisition: applicant.req, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        name: 'partial once the consultation is recorded and a reviewer is assigned',
        files: {
          'src/screen.ts':
            'export function screenCandidate(applicant) {\n  const resumeScore = rankResume(applicant.resume);\n  return { candidate: applicant.id, job_requisition: applicant.req, shortlist: resumeScore > 0.7, hiring_decision: resumeScore > 0.7 ? "advance" : "reject" };\n}\n',
          'src/review.ts':
            'export async function assignReviewer(decisionId, reviewerId) {\n  return db.reviews.create({ decisionId, assigned_reviewer: reviewerId });\n}\n',
          'docs/deployer-obligations.md':
            '# Deployer obligations\n\n## Article 26(7) — informing workers\n\nThe staff consultation was completed on 2026-06-12 with the works council, and the affected workers were informed before the system was put into service.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art27.fria',
    // No penalty tier. Article 99(4) is a closed list of nine heads, and its
    // deployer head — (e) — reaches "obligations of deployers pursuant to
    // Article 26". Article 27 is a separate article and is not incorporated
    // into Article 26 by reference, so no Union-level ceiling attaches to it.
    // Article 99(1) still obliges Member States to lay down penalties; what
    // the Regulation does not give is the EUR 15 000 000 / 3 % figure, and
    // quoting one it does not give inflates the headline for any high-risk
    // system failing only this duty.
    title: 'Fundamental rights impact assessment before first use',
    obligation:
      'Article 27(1) requires deployers that are bodies governed by public law, private entities providing public services, or deployers of the creditworthiness and life-and-health-insurance systems in Annex III points 5(b) and 5(c) — in each case other than for the critical-infrastructure systems in Annex III point 2 — to perform an assessment of the impact on fundamental rights before first use: the deployment processes, the period and frequency of use, the categories of natural persons likely to be affected, the specific risks of harm to them, the human oversight measures, and the measures to take if those risks materialise. Article 27(4) allows an existing GDPR data protection impact assessment to be complemented rather than duplicated.',
    family: 'risk-management',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(27, '(1)', 'Fundamental rights impact assessment for high-risk AI systems'),
      aiActArticle(27, '(4)', 'Complementing an existing data protection impact assessment'),
    ],
    // Article 27(1) has three limbs, and the predicate carried only the third.
    // (i) bodies governed by public law and (ii) private entities providing
    // public services are the limbs that reach a municipality's recruitment
    // tool, a public hospital's triage system and a school's grading model —
    // none of which is an Annex III point 5 use case, and all of which owe a
    // FRIA. Neither is visible in code, so they arrive as an operator
    // attestation; limb (iii) is detectable and stays detected.
    //
    // Point 2 (critical infrastructure) is excluded on the face of 27(1).
    appliesWhen: allOf(
      whenHighRisk,
      (ctx: EvaluationContext) => !ctx.classification.findings.some((f) => f.id === 'annex-iii.2.infrastructure'),
      anyOf(
        (ctx: EvaluationContext) => ctx.profile.publicBodyOrPublicService === true,
        whenFinding('annex-iii.5b.credit', 'annex-iii.5c.insurance'),
      ),
    ),
    evaluate: (ctx) => {
      const fria = ctx.grepDocs(
        /\b(fundamental[_\s-]?rights[_\s-]?impact|fria)\b/i,
        3,
        /(fundamental|fria|impact|rights|risk|dpia|readme)/i,
      );
      if (fria.length > 0) return satisfied('A fundamental rights impact assessment was found.', fria);

      const dpia = ctx.signals.get('governance.dpia');
      if (dpia && dpia.hits > 0) {
        return partial(
          'A data protection impact assessment was found, but nothing addresses fundamental rights beyond data protection.',
          'Article 27(4) lets you complement the DPIA rather than start again — but the additional elements are specific: the period and frequency of use, the categories of persons likely to be affected, the specific risks of harm to them, and what you will do if those risks materialise. Add them to the existing assessment and say that is what you have done.',
          dpia.evidence.slice(0, 3),
        );
      }
      return missing(
        'No fundamental rights impact assessment was found for a use case Article 27(1) names.',
        'Perform it before first use. Article 27(4) means the work is smaller than it looks if a GDPR DPIA already exists: complement it rather than duplicating it, and notify the market surveillance authority of the result under Article 27(3).',
        ['fundamental rights impact assessment', 'FRIA', 'Article 27'],
      );
    },
    tests: [
      {
        // Article 27(4) means the work is smaller where a DPIA exists, but the
        // additional elements are specific and a DPIA does not contain them.
        name: 'partial when a DPIA exists but nothing addresses fundamental rights',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: creditScore > 640 ? "approve" : "decline" };\n}\n',
          'docs/dpia.md':
            '# Data protection impact assessment\n\nA DPIA under GDPR Article 35 was completed on 2026-04-02 for the underwriting pipeline.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
      {
        name: 'satisfied when a fundamental rights impact assessment is recorded',
        files: {
          'src/underwrite.ts':
            'export function underwrite(borrower) {\n  const creditScore = model.predict(borrower);\n  return { borrower: borrower.id, credit_score: creditScore, loan_decision: creditScore > 640 ? "approve" : "decline" };\n}\n',
          'docs/fundamental-rights-impact.md':
            '# Fundamental rights impact assessment (Article 27)\n\nCompleted 2026-05-20, before first use. Covers the deployment processes, the period and frequency of use, the categories of natural persons likely to be affected, the specific risks of harm to them, the human oversight measures, and what we do if those risks materialise. It complements the GDPR DPIA of 2026-04-02 rather than duplicating it.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),

  c({
    id: 'eu-ai-act.art86.right-to-explanation',
    // Deliberately no penalty tier. Article 99(4) enumerates the operator
    // duties that carry the EUR 15 000 000 / 3 % administrative fine, and
    // Article 86 is not among them: it is an individual right, exercised by
    // the affected person against the deployer, backed by the Article 85
    // complaint route rather than by a fine head of its own. Pricing it would
    // be inventing an exposure figure the Regulation does not provide.
    title: 'Explain an individual decision to the person it was taken about',
    obligation:
      'Article 86(1) gives any affected person subject to a decision the deployer takes on the basis of output from an Annex III high-risk system — other than the critical-infrastructure systems in point 2 — which produces legal effects or similarly significantly affects them in a way they consider adverse to their health, safety or fundamental rights, the right to obtain from the deployer clear and meaningful explanations of the role of the AI system in the decision procedure and of the main elements of the decision taken. Article 86(3) applies it only to the extent the right is not already provided for under other Union law.',
    family: 'rights',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    // Article 86 sits in Chapter IX, Section 4. Article 113 leaves Chapter IX
    // to the general date, so this right has been exercisable since 2 August
    // 2026 even though the Chapter III duties over the same system do not bite
    // until 2 December 2027. It is one of the few high-risk-adjacent duties
    // that is live today, which is exactly why it is worth evaluating.
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(86, '(1)', 'Right to explanation of individual decision-making'),
      aiActArticle(86, '(3)', 'The right applies only where Union law does not already provide it'),
    ],
    appliesWhen: allOf(whenHighRisk, (ctx: EvaluationContext) =>
      ctx.classification.findings.some((f) => f.id.startsWith('annex-iii.') && f.id !== 'annex-iii.2.infrastructure'),
    ),
    evaluate: (ctx) => {
      const explains = evidenceFrom(ctx, 'transparency.explanation').slice(0, 3);
      // The duty is discharged towards a person, not towards a log. A model
      // that can produce reason codes is necessary and not sufficient: there
      // has to be a route by which the person the decision was about can ask.
      const route = ctx.grepDocs(
        /\b(right to (an )?explanation|request an explanation|explanation request|how (to|you can) (request|obtain) an explanation|article 86)\b/i,
        3,
        /(explanation|rights|transparency|appeal|complaint|privacy|readme|notice)/i,
      );

      if (explains.length > 0 && route.length > 0) {
        return satisfied(
          'The system produces explanations of its outputs, and a route for an affected person to ask for one is documented.',
          [...explains, ...route].slice(0, 5),
        );
      }
      if (route.length > 0) {
        return partial(
          'A route for an affected person to request an explanation is documented, but nothing in the code produces one.',
          'Article 86(1) asks for the role the system played in the decision procedure and the main elements of the decision taken. Carry the inputs that moved the outcome out of the decision path and store them with the decision, so the answer to a request is a record rather than a reconstruction.',
          route,
        );
      }
      if (explains.length > 0) {
        return partial(
          'The system produces explanations of its outputs, but no route was found by which the person a decision was about can ask for one.',
          'The right is exercised by the affected person against the deployer. Publish how to ask — in the decision notice itself, or wherever you tell people about their rights — and say who answers.',
          explains,
        );
      }
      return missing(
        'Nothing was found that would answer an affected person asking why a decision about them came out the way it did.',
        `Record, with each decision, the role the system played and the main elements of the outcome, and publish how a person asks for them. Where a GDPR Article 22(3) route already exists, Article 86(3) means extending it is enough — but Article 86 asks about the role of the system in the procedure, which Article 22(3) does not. ${TIMING_HEDGE}`,
        ['right to explanation', 'Article 86', 'reason codes stored with the decision'],
      );
    },
    tests: [
      {
        name: 'missing when a decision is returned with no explanation and no route to ask',
        files: {
          'src/screen.ts':
            "export function screen(candidate) {\n  const parsedResume = parseResume(candidate.cv);\n  const rankScore = model.rank(parsedResume, jobRequisition);\n  return { candidate: candidate.id, rank_score: rankScore, decision: rankScore > 0.7 ? 'advance' : 'reject' };\n}\n",
        },
        profile: { tierOverride: 'high' },
        expect: 'missing',
      },
      {
        name: 'partial when reason codes exist but nobody is told how to ask',
        files: {
          'src/screen.ts':
            "export function screen(candidate) {\n  const parsedResume = parseResume(candidate.cv);\n  const rankScore = model.rank(parsedResume, jobRequisition);\n  const reasonCodes = explainRanking(parsedResume, rankScore);\n  return { candidate: candidate.id, rank_score: rankScore, reason_codes: reasonCodes, decision: rankScore > 0.7 ? 'advance' : 'reject' };\n}\n",
        },
        profile: { tierOverride: 'high' },
        expect: 'partial',
      },
      {
        name: 'satisfied when explanations are produced and the route to ask is published',
        files: {
          'src/screen.ts':
            "export function screen(candidate) {\n  const parsedResume = parseResume(candidate.cv);\n  const rankScore = model.rank(parsedResume, jobRequisition);\n  const reasonCodes = explainRanking(parsedResume, rankScore);\n  return { candidate: candidate.id, rank_score: rankScore, reason_codes: reasonCodes, decision: rankScore > 0.7 ? 'advance' : 'reject' };\n}\n",
          'docs/candidate-rights.md':
            '# Your rights\n\n## Right to an explanation\n\nUnder Article 86 of the EU AI Act you can request an explanation of any\nscreening decision taken about you: the role the system played in the\nprocedure and the main elements of the decision. Write to\nprivacy@example.com and we answer within thirty days.\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),
];

// ===========================================================================

export const EU_AI_ACT_PACK: RulePack = {
  id: 'eu-ai-act',
  name: 'EU AI Act',
  version: '2026.09.1',
  jurisdiction: 'European Union',
  instrument: 'Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744 (Digital Omnibus on AI)',
  reconciledOn: '2026-09-15',
  summary:
    'The EU Artificial Intelligence Act. Prohibited practices have applied since 2 February 2025 and Article 50 transparency since 2 August 2026. The Digital Omnibus, in force 27 July 2026, moved the Annex III high-risk obligations to 2 December 2027 and the Annex I obligations to 2 August 2028 — but left Article 50 exactly where it was.',
  url: 'https://artificialintelligenceact.eu/',
  milestones: [
    { date: DATES.PROHIBITIONS, label: 'Prohibited practices and AI literacy', note: 'Chapters I and II applied from 2 February 2025.' },
    { date: DATES.GPAI, label: 'General-purpose AI model obligations', note: 'Chapter V applied from 2 August 2025.' },
    { date: DATES.GENERAL, label: 'Article 50 transparency', note: 'General application. Not moved by the Digital Omnibus — this is the obligation that binds AI products today.' },
    { date: DATES.MARKING_GRACE, label: 'Synthetic content marking', note: 'Article 111(4): systems on the market before 2 August 2026 must comply with Article 50(2) by 2 December 2026.' },
    { date: DATES.NEW_PROHIBITIONS, label: 'New Article 5 prohibitions', note: 'Article 5(1)(ba) and (bb) — non-consensual intimate imagery and CSAM — apply from 2 December 2026.' },
    { date: DATES.HIGH_RISK_ANNEX_III, label: 'Annex III high-risk obligations', note: 'Moved from 2 August 2026 by Regulation (EU) 2026/1744.' },
    { date: DATES.HIGH_RISK_ANNEX_I, label: 'Annex I embedded high-risk obligations', note: 'Moved from 2 August 2027 by Regulation (EU) 2026/1744.' },
  ],
  penalty: {
    currency: 'EUR',
    smeInversion: true,
    description:
      'Administrative fines under Article 99. For SMEs and start-ups, Article 99(6) inverts the rule: the cap is the lower of the two figures, not the higher.',
    tiers: [
      {
        id: 'art99-3',
        label: 'Prohibited practices (Article 5)',
        amount: 35_000_000,
        turnoverPct: 7,
        citation: aiActArticle(99, '(3)', 'Penalties — prohibited practices'),
      },
      {
        id: 'art99-4',
        label: 'Provider, deployer and Article 50 transparency obligations (Arts. 9-15, 17 and 19 are reached through Article 16, not fined in their own right)',
        amount: 15_000_000,
        turnoverPct: 3,
        citation: aiActArticle(99, '(4)', 'Penalties — other obligations'),
      },
      {
        id: 'art99-5',
        label: 'Incorrect, incomplete or misleading information to authorities',
        amount: 7_500_000,
        turnoverPct: 1,
        citation: aiActArticle(99, '(5)', 'Penalties — misleading information'),
      },
    ],
  },
  controls: [...prohibitionControls, ...liveControls, ...highRiskControls],
};

export { anyOf, always, whenFinding, notApplicable };
