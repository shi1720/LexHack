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
  /** Chapter III as regards Annex III high-risk systems (Art. 6(2)). */
  HIGH_RISK_ANNEX_III: '2027-12-02',
  /** Chapter III as regards Annex I high-risk systems (Art. 6(1)). */
  HIGH_RISK_ANNEX_I: '2028-08-02',
} as const;

const ANNEX_IV_DOC = 'docs/ai-act/annex-iv-technical-documentation.md';

// ===========================================================================
// Chapter II — prohibited practices. In force since 2 February 2025.
// ===========================================================================

const prohibitionControls: Control[] = [
  c({
    id: 'eu-ai-act.art5.emotion-workplace',
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
      const ev = ctx.grepDocs(/\bai[\s-]?(literacy|training|onboarding|usage[\s-]?polic)/i, 4);
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
  }),
  c({
    id: 'eu-ai-act.art50.3.biometric-notification',
    title: 'Notify people exposed to emotion recognition or biometric categorisation',
    obligation:
      'Article 50(3) requires deployers of an emotion recognition system or a biometric categorisation system to inform the natural persons exposed to it of the operation of the system, and to process personal data in accordance with the GDPR.',
    family: 'transparency',
    severity: 'high',
    weight: 6,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [aiActArticle(50, '(3)', 'Transparency obligations — emotion recognition and biometric categorisation')],
    appliesWhen: whenSignal('domain.emotion.recognition', 'domain.biometric.categorisation'),
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
    title: 'Disclose deep fakes and AI-written public-interest text',
    obligation:
      'Article 50(4) requires deployers of systems generating or manipulating image, audio or video constituting a deep fake to disclose that the content is artificially generated or manipulated, and deployers generating text published to inform the public on matters of public interest to disclose the same — unless the text underwent human review and a person holds editorial responsibility.',
    family: 'transparency',
    severity: 'medium',
    weight: 5,
    method: 'static-analysis',
    appliesFrom: DATES.GENERAL,
    citations: [aiActArticle(50, '(4)', 'Transparency obligations — deep fakes and public-interest text')],
    appliesWhen: whenSignal('domain.synthetic.content'),
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
    id: 'eu-ai-act.art25.role-determination',
    title: 'Determine and record whether you are the provider',
    obligation:
      'Article 3(3) makes whoever develops an AI system and places it on the market under their own name the provider. Article 25(1)(c) converts a deployer into the provider of a high-risk system where they repoint a general-purpose AI system at an Annex III use case. Article 16 then attaches the full provider stack.',
    family: 'documentation',
    severity: 'high',
    weight: 5,
    method: 'documentation',
    appliesFrom: DATES.GENERAL,
    citations: [
      aiActArticle(3, '(3)', "Definitions — 'provider'"),
      aiActArticle(25, '(1)(c)', 'Responsibilities along the AI value chain — change of intended purpose'),
      aiActArticle(25, '(2)', 'Duty of the initial provider to cooperate and hand over documentation'),
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
      return {
        status: 'missing',
        finding:
          'This repository calls a third-party model and ships the result under its own name. On the Article 3(3) definition that makes it the provider of an AI system, not merely a deployer — the distinction that decides who owns the Article 16 stack.',
        gap: 'Record your role in writing. Then check whether your model vendor has specified that its system is "not to be changed into a high-risk AI system": that switches off the Article 25(2) duty to hand you the documentation you need for Annex IV, and leaves you to produce it alone.',
        evidence: evidenceFrom(
          ctx,
          'ai.provider.openai',
          'ai.provider.anthropic',
          'ai.provider.google',
          'ai.provider.cloud',
          'ai.provider.openweights',
        ),
      };
    },
  }),
];

// ===========================================================================
// Chapter III — high-risk requirements. Annex III systems: 2 December 2027.
// ===========================================================================

const highRiskControls: Control[] = [
  c({
    id: 'eu-ai-act.art9.risk-management',
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
      const docs = ctx.grepDocs(/\brisk\s+(register|assessment|management|matrix)\b/i, 5);
      const residual = ctx.grepDocs(/\bresidual\s+risk\b/i, 2);
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
  }),
  c({
    id: 'eu-ai-act.art10.bias-examination',
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
        return satisfied(
          'Inference logging was found, carrying both a model version and a traceable identifier.',
          [...inference.evidence.slice(0, 3), ...ctx.signals.evidenceFor('control.model.version').slice(0, 2)],
        );
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
      if (shortest !== undefined && shortest < 180) {
        return {
          status: 'missing',
          finding: `A retention period of ${shortest} days was found. Article 19(1) sets a floor of six months (about 183 days).`,
          gap: `Raise the retention window to at least 183 days. The current value is ${183 - shortest} days short of the statutory floor.`,
          evidence: retention.evidence.slice(0, 3),
        };
      }
      return satisfied('A log retention period meeting the six-month floor was declared.', retention.evidence.slice(0, 3));
    },
  }),
  c({
    id: 'eu-ai-act.art13.instructions-for-use',
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
      const limitations = ctx.grepDocs(/^#+\s*(limitations|known issues|out[- ]of[- ]scope)/im, 3);
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
        'Write the instructions against the eleven points of Article 13(3). The hardest and most important is (b)(v): accuracy for specific persons or groups, not just overall.',
        ['instructions for use', 'intended purpose', 'limitations'],
      );
    },
    remediation: {
      summary: 'Scaffold Article 13 instructions for use against all eleven statutory points.',
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
        name: 'satisfied with review, override and a stop control',
        files: {
          'src/decide.py':
            'import os\nAI_ENABLED = os.getenv("AI_ENABLED") != "false"\n\ndef decide(applicant):\n    if not AI_ENABLED:\n        return "halted"\n    score = model.predict(applicant)\n    return {"status": "pending_review", "human_review": True}\n',
          'src/review.py':
            'def override_decision(decision_id, reviewer_id, reason):\n    """Human review: a reviewer can override the model output."""\n    return record_override(decision_id, reviewer_id, reason)\n',
        },
        profile: { tierOverride: 'high' },
        expect: 'satisfied',
      },
    ],
  }),
  c({
    id: 'eu-ai-act.art15.accuracy',
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
      const declared = ctx.grepDocs(/\b(accuracy|precision|recall|f1|auc)\b[\s\S]{0,40}[\d.]+\s*%?/i, 3);
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
  }),
  c({
    id: 'eu-ai-act.art15.cybersecurity',
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
    title: 'Post-market monitoring plan',
    obligation:
      'Article 72 requires a documented post-market monitoring system, proportionate to the risks, that actively and systematically collects and analyses data on performance throughout the lifetime of the system. Article 72(3) makes the monitoring plan part of the Annex IV technical documentation.',
    family: 'post-market',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(72, '(1)', 'Post-market monitoring by providers'),
      aiActAnnex('IV', '9', 'Technical documentation — post-market monitoring plan'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const plan = ctx.grepDocs(/post[\s-]?market\s+monitoring/i, 3);
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
        'Define the signals you will collect once the system is live, the thresholds that trigger action, and who owns each one.',
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
    title: 'Serious incident reporting procedure',
    obligation:
      'Article 73 requires providers to report serious incidents to the market surveillance authority: within 2 days for a widespread infringement or an Article 3(49)(b) incident, within 10 days where a person has died, and in any event within 15 days otherwise. Article 73(6) forbids altering the system in a way that affects the later evaluation of causes before informing the authorities.',
    family: 'incident-response',
    severity: 'high',
    weight: 6,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(73, '(2)', 'Reporting of serious incidents — 15-day default'),
      aiActArticle(73, '(3)', 'Reporting of serious incidents — 2 days'),
      aiActArticle(73, '(4)', 'Reporting of serious incidents — 10 days where a person has died'),
    ],
    appliesWhen: whenHighRisk,
    evaluate: (ctx) => {
      const procedure = ctx.grepDocs(/\b(incident\s+(response|report\w*)|runbook|escalation|post[\s-]?mortem)\b/i, 4);
      const deadlines = ctx.grepDocs(/\b(15\s*days?|2\s*days?|10\s*days?)\b[\s\S]{0,60}\b(report|authority|incident)/i, 2);
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
        'Write the procedure, name the authority, and start the clock at the moment of awareness rather than the moment of confirmation.',
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
    title: 'Registration in the EU database',
    obligation:
      'Article 49(1) requires the provider of an Annex III high-risk system (other than point 2) to register itself and the system in the EU database before placing it on the market. Article 49(2) requires the same registration even where the provider concludes under Article 6(3) that the system is not high-risk.',
    family: 'registration',
    severity: 'medium',
    weight: 4,
    method: 'documentation',
    appliesFrom: DATES.HIGH_RISK_ANNEX_III,
    citations: [
      aiActArticle(49, '(1)', 'Registration of high-risk AI systems'),
      aiActArticle(49, '(2)', 'Registration where the provider claims the Article 6(3) derogation'),
      aiActArticle(6, '(4)', 'Documented assessment where a provider considers a system not high-risk'),
    ],
    appliesWhen: whenHighRisk,
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
            'Register the system before placing it on the market. Note the trap in Article 49(2): concluding under Article 6(3) that your system is *not* high-risk does not exempt you — it still has to be registered, and the assessment has to be documented beforehand under Article 6(4).',
            ['EU database', 'Article 49', 'declaration of conformity', 'CE marking'],
          );
    },
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
    { date: DATES.MARKING_GRACE, label: 'Synthetic content marking deadline', note: 'Article 111(4): systems on the market before 2 August 2026 must comply with Article 50(2) by 2 December 2026.' },
    { date: DATES.NEW_PROHIBITIONS, label: 'New Article 5 prohibitions', note: 'Article 5(1)(ba) and (bb) — non-consensual intimate imagery and CSAM — apply from 2 December 2026.' },
    { date: DATES.HIGH_RISK_ANNEX_III, label: 'Annex III high-risk obligations', note: 'Moved from 2 August 2026 by Regulation (EU) 2026/1744.' },
    { date: DATES.HIGH_RISK_ANNEX_I, label: 'Annex I embedded high-risk obligations', note: 'Moved from 2 August 2027 by Regulation (EU) 2026/1744.' },
  ],
  penalty: {
    description:
      'Administrative fines under Article 99. For SMEs and start-ups, Article 99(6) inverts the rule: the cap is the lower of the two figures, not the higher.',
    tiers: [
      {
        label: 'Prohibited practices (Article 5)',
        amountEur: 35_000_000,
        turnoverPct: 7,
        citation: aiActArticle(99, '(3)', 'Penalties — prohibited practices'),
      },
      {
        label: 'Provider, deployer and Article 50 transparency obligations',
        amountEur: 15_000_000,
        turnoverPct: 3,
        citation: aiActArticle(99, '(4)', 'Penalties — other obligations'),
      },
      {
        label: 'Incorrect, incomplete or misleading information to authorities',
        amountEur: 7_500_000,
        turnoverPct: 1,
        citation: aiActArticle(99, '(5)', 'Penalties — misleading information'),
      },
    ],
  },
  controls: [...prohibitionControls, ...liveControls, ...highRiskControls],
};

export { anyOf, always, whenFinding, notApplicable };
