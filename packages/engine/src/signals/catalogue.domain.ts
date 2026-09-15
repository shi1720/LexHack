import { defineSignal, type CompiledSignal } from './define.js';
import type { SourceFile } from '../types.js';

/**
 * Domain signals answer "what is this system *for*". They are the input to the
 * Annex III / Art. 5 classifier, so they are deliberately conservative: a
 * domain signal must fire on identifiers and strings in real code paths, not on
 * a passing mention in a README.
 */

/**
 * Code that *describes* a practice is not code that performs it.
 *
 * Test fixtures, benchmark corpora and example directories are full of strings
 * that look exactly like the thing they test for — Annex found this by scanning
 * itself and reporting its own benchmark corpus as a prohibited practice. Every
 * domain signal is therefore blind to them, the same way a SAST tool does not
 * report the exploit in its own regression suite.
 */
const NOT_TEST_DATA =
  /(^|\/)(tests?|__tests__|__mocks__|spec|e2e|fixtures?|testdata|benchmark|benchmarks|examples?|samples?|mocks?)\//i;

/** Require N distinct corroborating terms in a file before believing a domain claim. */
function corroborate(terms: string[], min = 2) {
  return (file: SourceFile): boolean => {
    const lower = file.text.toLowerCase();
    let hits = 0;
    for (const term of terms) {
      if (lower.includes(term)) hits++;
      if (hits >= min) return true;
    }
    return false;
  };
}

export const DOMAIN_SIGNALS: CompiledSignal[] = [
  // --- Annex III(4): employment, worker management -------------------------
  defineSignal({
    id: 'domain.employment.screening',
    label: 'Recruitment / candidate screening',
    category: 'domain',
    description: 'Filters, ranks or scores job applicants — Annex III, point 4(a).',
    keywords: ['candidate', 'applicant', 'resume', 'curriculum vitae', 'shortlist', 'job_posting', 'jobposting', 'recruit'],
    patterns: [
      /\b(candidate|applicant|resume|cv)[_\s]?(score|rank|screen|filter|match|fit|shortlist|reject|parse)/i,
      /\b(score|rank|screen|filter|shortlist|reject|evaluate)[_\s]?(candidate|applicant|resume|cv)s?\b/i,
      /\b(applicantTrackingSystem|ats_|recruitment|recruiting|hiring[_.]?(pipeline|decision|score))\b/i,
      /\b(job_?requisition|job_?posting|interview_?score|hiring_?manager)\b/i,
    ],
    fileGuard: corroborate(['candidate', 'applicant', 'resume', 'job', 'hiring', 'recruit', 'interview'], 2),
    maxEvidence: 16,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.employment.management',
    label: 'Worker management / task allocation',
    category: 'domain',
    description: 'Allocates tasks, monitors or evaluates workers — Annex III, point 4(b).',
    keywords: ['employee', 'worker', 'shift', 'performance review', 'productivity', 'termination'],
    patterns: [
      /\b(employee|worker|staff)[_\s]?(score|rank|rating|performance|monitor|productivity|evaluat)/i,
      /\b(task|shift|schedule)[_\s]?(allocation|assignment|optimi[sz]ation)\b/i,
      /\b(promotion|termination|firing|attrition|churn)[_\s]?(score|risk|prediction|model)\b/i,
    ],
    fileGuard: corroborate(['employee', 'worker', 'staff', 'performance', 'shift', 'productivity'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Annex III(5): essential services ------------------------------------
  defineSignal({
    id: 'domain.credit.scoring',
    label: 'Creditworthiness assessment',
    category: 'domain',
    description: 'Evaluates creditworthiness or establishes a credit score — Annex III, point 5(b).',
    keywords: ['credit', 'loan', 'underwrit', 'fico', 'default_probability', 'borrower', 'mortgage'],
    patterns: [
      /\b(credit|loan|mortgage)[_\s]?(score|scoring|risk|decision|approval|limit|underwriting)\b/i,
      /\b(underwrit\w+|creditworth\w+|borrower[_\s]?risk|probability[_\s]?of[_\s]?default|\bpd_model\b)/i,
      /\b(fico|vantage_?score|debt[_\s]?to[_\s]?income|dti_ratio)\b/i,
    ],
    fileGuard: corroborate(['credit', 'loan', 'borrower', 'underwrit', 'risk', 'mortgage'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.insurance.pricing',
    label: 'Life / health insurance risk pricing',
    category: 'domain',
    description: 'Prices or assesses risk for life and health insurance — Annex III, point 5(c).',
    keywords: ['insurance', 'premium', 'policyholder', 'actuarial', 'claim'],
    patterns: [
      /\b(insurance|policy)[_\s]?(premium|pricing|risk|rating|underwriting)\b/i,
      /\b(actuarial|policyholder|claims?[_\s]?(denial|approval|scoring))\b/i,
    ],
    fileGuard: corroborate(['insurance', 'premium', 'policyholder', 'actuarial'], 2),
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.public-benefits',
    label: 'Public assistance eligibility',
    category: 'domain',
    description: 'Determines access to essential public benefits or services — Annex III, point 5(a).',
    keywords: ['benefit', 'welfare', 'entitlement', 'social security', 'housing assistance', 'eligibility'],
    patterns: [
      /\b(benefit|welfare|entitlement|subsidy|housing)[_\s]?(eligibility|determination|decision|assessment|fraud)\b/i,
      /\b(social[_\s]security|public[_\s]assistance|means[_\s]test\w*)\b/i,
    ],
    fileGuard: corroborate(['benefit', 'welfare', 'eligibility', 'assistance', 'claimant'], 2),
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.emergency.triage',
    label: 'Emergency / clinical triage',
    category: 'domain',
    description: 'Triages patients or dispatches emergency services — Annex III, point 5(d).',
    keywords: ['triage', 'patient', 'symptom', 'diagnosis', 'emergency', 'severity score'],
    patterns: [
      /\btriage\b|\b(patient|symptom)[_\s]?(score|priority|severity|assessment|risk)\b/i,
      /\b(diagnos\w+|clinical[_\s]?(decision|support)|icd[_-]?10|snomed)\b/i,
      /\bemergency[_\s]?(dispatch|call|priority)\b/i,
    ],
    fileGuard: corroborate(['patient', 'triage', 'symptom', 'clinical', 'diagnosis', 'emergency'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Annex III(3): education ---------------------------------------------
  defineSignal({
    id: 'domain.education.assessment',
    label: 'Education access or assessment',
    category: 'domain',
    description: 'Decides admission, assigns learners or grades them — Annex III, point 3.',
    keywords: ['student', 'admission', 'exam', 'grading', 'enrollment', 'coursework', 'proctor'],
    patterns: [
      /\b(student|learner|pupil)[_\s]?(score|grade|rank|admission|placement|evaluation)\b/i,
      /\b(admissions?|enrol?lment)[_\s]?(decision|score|model|ranking)\b/i,
      /\b(auto[_\s]?grading|essay[_\s]?scor\w+|proctor\w*|exam[_\s]?(cheat|monitor))\b/i,
    ],
    fileGuard: corroborate(['student', 'admission', 'exam', 'grade', 'course', 'learner'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Annex III(1): biometrics --------------------------------------------
  defineSignal({
    id: 'domain.biometric.identification',
    label: 'Biometric identification',
    category: 'domain',
    description: 'Identifies or verifies people from biometric data — Annex III, point 1(a).',
    keywords: ['face_recognition', 'facerecognition', 'face_embedding', 'faceid', 'fingerprint', 'iris', 'voiceprint', 'biometric'],
    patterns: [
      /\bface[_\s]?(recognition|match|embedding|encoding|verify|identify|detect)\b/i,
      /\b(fingerprint|iris[_\s]?scan|voiceprint|retina|gait[_\s]?analysis)\b/i,
      /\bbiometric[_\s]?(template|identifier|match|auth)/i,
      /\b(deepface|face_recognition|insightface|facenet|dlib\.face)/i,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.biometric.verification-only',
    label: 'One-to-one biometric verification',
    category: 'domain',
    description:
      'Confirms a claimed identity against a single reference — expressly outside Annex III, point 1(a), which excludes biometric verification whose sole purpose is to confirm that a person is who they claim to be.',
    keywords: ['verify', 'verification', 'one-to-one', 'one_to_one', '1:1', 'selfie', 'passport', 'liveness', 'claimed identity'],
    patterns: [
      /\bone[_\s-]?to[_\s-]?one\b|\b1\s*:\s*1\s*(match|verification|compare)/i,
      /\bverify[_\s]?identity\b|\bidentity[_\s]?verification\b|\bcompare[_\s]?one[_\s]?to[_\s]?one\b/i,
      /\b(selfie|liveness)[\s\S]{0,40}\b(passport|document|id[_\s]?card|reference)\b/i,
      /\bconfirm\w*[\s\S]{0,40}\bclaimed[_\s]?identity\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.biometric.categorisation',
    label: 'Biometric categorisation',
    category: 'domain',
    description: 'Infers attributes about people from biometric data — Annex III, point 1(b); Art. 5(1)(g) when the attribute is protected.',
    keywords: ['gender_detection', 'age_estimation', 'ethnicity', 'race_classifier', 'skin_tone', 'face_attribute'],
    patterns: [
      /\b(gender|sex|age|ethnicity|race|skin[_\s]?tone)[_\s]?(detect\w*|classif\w*|estimat\w*|predict\w*|infer\w*)\b/i,
      /\bface[_\s]?attribute\w*|demographic[_\s]?(inference|prediction)\b/i,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.emotion.recognition',
    label: 'Emotion recognition',
    category: 'domain',
    description: 'Infers emotional state from biometric data — Annex III, point 1(c); prohibited at work or school under Art. 5(1)(f).',
    keywords: ['emotion', 'affect', 'mood detect', 'sentiment of', 'facial expression', 'micro-expression', 'engagement score'],
    patterns: [
      /\b(emotion|affect|mood)[_\s]?(recognition|detect\w*|classif\w*|analysis|score|inference|state)\b/i,
      /\b(facial|micro)[_\s-]?expression[_\s]?(analysis|detect\w*|recognition)?\b/i,
      /\b(detect|infer|predict|analyz\w*|classif\w*)[_\s]?(emotion|mood|affect|stress|engagement|enthusiasm|confidence)[_\s]?(level|score|state)?\b/i,
      /\b(EMOTION_LABELS|emotion_labels|EMOTIONS)\b/,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.biometric.scraping',
    label: 'Untargeted facial image scraping',
    category: 'domain',
    description: 'Builds facial recognition databases by scraping — prohibited under Art. 5(1)(e).',
    keywords: ['scrape', 'crawl', 'face database', 'facial database'],
    patterns: [
      /\b(scrap\w+|crawl\w+|harvest\w+)[\s\S]{0,40}\b(face|facial|profile[_\s]?photo|headshot|avatar)s?\b/i,
      /\b(face|facial)[_\s]?(database|db|gallery|corpus)[\s\S]{0,30}\b(scrap|crawl|build|ingest)/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Art. 5 prohibitions --------------------------------------------------
  defineSignal({
    id: 'domain.social-scoring',
    label: 'Social scoring',
    category: 'domain',
    description: 'Scores people on social behaviour or personal traits with detrimental treatment — prohibited under Art. 5(1)(c).',
    keywords: ['trust_score', 'trustscore', 'social_score', 'reputation_score', 'citizen_score', 'behaviour_score', 'behavior_score'],
    patterns: [
      /\b(social|citizen|trust\w*|reputation|behaviou?r\w*)[_\s]?score\b/i,
      /\bscore[_\s]?(citizen|person|individual)s?\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.predictive-policing',
    label: 'Individual crime-risk prediction',
    category: 'domain',
    description: 'Predicts criminal offending by individuals from profiling — prohibited under Art. 5(1)(d); Annex III, point 6 otherwise.',
    keywords: ['recidivism', 'crime_risk', 'criminal risk', 'predictive policing', 'offender'],
    patterns: [
      /\b(recidivism|reoffend\w*|criminal|crime|offend\w*)[_\s]?(risk|score|prediction|probability|propensity)\b/i,
      /\bpredictive[_\s]?policing\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.vulnerability.exploitation',
    label: 'Targeting of vulnerable groups',
    category: 'domain',
    description: 'Segments users by age, disability or socio-economic vulnerability to change behaviour — Art. 5(1)(b) risk area.',
    keywords: ['vulnerable', 'minor', 'under 18', 'under_18', 'disability', 'low_income', 'debt_level'],
    patterns: [
      /\b(vulnerab\w+|at[_\s]?risk)[_\s]?(user|segment|group|cohort|audience)\b/i,
      /\b(target|segment)\w*[\s\S]{0,30}\b(minors?|children|elderly|disabled|low[_\s]?income|indebted)\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Annex III(6)-(8): law enforcement, migration, justice ---------------
  defineSignal({
    id: 'domain.migration.border',
    label: 'Migration, asylum or border control',
    category: 'domain',
    description: 'Assesses visa, asylum or border applications — Annex III, point 7.',
    keywords: ['visa', 'asylum', 'immigration', 'border control', 'residence permit'],
    patterns: [
      /\b(visa|asylum|immigration|residence[_\s]?permit|border)[_\s]?(application|decision|risk|assessment|screening|eligibility)\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.justice.administration',
    label: 'Administration of justice',
    category: 'domain',
    description: 'Assists a judicial authority in researching, interpreting or applying the law — Annex III, point 8(a).',
    keywords: ['judicial', 'court', 'sentencing', 'case law', 'judgment', 'tribunal'],
    patterns: [
      /\b(judicial|judge|court|tribunal)[_\s]?(decision|assist\w*|recommendation|support)\b/i,
      /\b(sentenc\w+|bail|parole)[_\s]?(recommendation|score|prediction|decision)\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.democratic.process',
    label: 'Influence on elections',
    category: 'domain',
    description: 'Influences voting behaviour or election outcomes — Annex III, point 8(b).',
    keywords: ['election', 'voter', 'ballot', 'political ad', 'campaign targeting'],
    patterns: [
      /\b(voter|election|ballot|referendum)[_\s]?(target\w*|persuasion|influence|micro[_\s]?targeting|model)\b/i,
      /\bpolitical[_\s]?(ad|messaging|targeting)\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.critical-infrastructure',
    label: 'Critical infrastructure safety component',
    category: 'domain',
    description: 'Controls or protects critical digital, water, gas, heating or electricity infrastructure — Annex III, point 2.',
    keywords: ['scada', 'plc', 'grid', 'substation', 'water treatment', 'traffic control', 'modbus'],
    patterns: [
      /\b(scada|modbus|iec[_\s]?61850|plc[_\s]?control)\b/i,
      /\b(power|electricity|water|gas|heating)[_\s]?(grid|network|supply)[_\s]?(control|management|safety)\b/i,
      /\btraffic[_\s]?(signal|control|management)[_\s]?(system|ai|model)?\b/i,
    ],
    maxEvidence: 6,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),

  // --- Art. 50 transparency triggers ---------------------------------------
  defineSignal({
    id: 'domain.chat.enduser',
    label: 'Conversational interface with people',
    category: 'domain',
    description: 'The system talks directly to natural persons — Art. 50(1) disclosure duty.',
    keywords: ['chat', 'conversation', 'message', 'assistant', 'widget', 'support bot'],
    patterns: [
      /\b(chat|conversation|thread|message)[_\s]?(widget|window|ui|interface|session|history|bubble)\b/i,
      /\b(chatbot|assistant|support[_\s]?bot|virtual[_\s]?agent)\b/i,
      /useChat\(|<Chat\b|ChatWindow|MessageList|ConversationView/,
    ],
    fileGuard: corroborate(['chat', 'message', 'assistant', 'conversation', 'user'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.synthetic.content',
    label: 'Synthetic content generation',
    category: 'domain',
    description: 'Generates or manipulates image, audio, video or text content — Art. 50(2) and 50(4) marking duties.',
    keywords: ['image generation', 'imagegeneration', 'text_to_image', 'texttoimage', 'images/generations', 'images.generate', 'tts', 'text-to-speech', 'texttospeech', 'voice clone', 'voiceclone', 'dall-e', 'dalle', 'stable diffusion', 'midjourney', 'synthesize', 'synthesise', 'elevenlabs', 'deepfake', 'deep fake', 'face swap'],
    patterns: [
      /\b(images?\.generate|text[_\s-]?to[_\s-]?(image|speech|video)|dall[_\s-]?e|stable[_\s-]?diffusion|midjourney)\b/i,
      /\b(voice[_\s]?(clone|synth\w*)|speech[_\s]?synth\w*|tts|elevenlabs)\b/i,
      /\b(deep[_\s]?fake|face[_\s]?swap|video[_\s]?generat\w*|avatar[_\s]?generat\w*)\b/i,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.automated.decision',
    label: 'Automated decision affecting a person',
    category: 'domain',
    description: 'Produces an outcome that determines how a person is treated — GDPR Art. 22 and Colorado SB 26-189 trigger.',
    keywords: ['approve', 'reject', 'decision', 'eligib', 'verdict', 'outcome', 'deny'],
    patterns: [
      /\b(auto|automatic|automated|ai|model)[_\s]?(approve|reject|decision|deny|decline|accept)\w*\b/i,
      /\b(decision|verdict|outcome)\s*[:=]\s*['"]?(approve|reject|deny|accept|decline)/i,
      /\bif\s*\(?\s*score\s*[<>]=?\s*[\d.]+\s*\)?[\s\S]{0,40}\b(reject|approve|deny|decline|advance|shortlist)/i,
    ],
    fileGuard: corroborate(['score', 'decision', 'approve', 'reject', 'threshold', 'eligib'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  // --- Article 6(3) and Article 50(2) carve-outs ---------------------------
  //
  // The statute provides its own exits, and a classifier that only knows how
  // to say "high-risk" over-reports — which is the fastest way for a
  // compliance tool to lose an engineering team. These signals do not demote
  // anything by themselves; they are the facts an operator needs in order to
  // decide whether a derogation is available, and the evidence they will cite
  // when they document it.
  defineSignal({
    id: 'task.extraction-only',
    label: 'Extraction, transcription or translation of existing content',
    category: 'ai-usage',
    description:
      'Reads content that already exists and re-expresses it without changing its meaning — OCR, transcription, parsing, faithful translation. Candidate for the Article 50(2) carve-out for systems that do not substantially alter the input data or its semantics.',
    keywords: ['ocr', 'extract', 'transcri', 'parse', 'translat', 'recogni'],
    patterns: [
      /\b(ocr|optical[_\s]?character|text[_\s]?extract\w*|extract[_\s]?(text|receipt|invoice|field|entit\w+|data))\b/i,
      /\b(transcri\w+|speech[_\s]?to[_\s]?text|stt|whisper)\b/i,
      /\b(parse|parser|parsing)[_\s]?(document|pdf|invoice|receipt|resume|form)\b/i,
      /\b(translate|translation)[_\s]?(text|content|document|string)\b/i,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'task.assists-human',
    label: 'Output is a suggestion a person acts on',
    category: 'control',
    description:
      'The system produces a draft, a suggestion or a flag for a person to act on rather than an outcome that applies itself. Relevant to Article 6(3)(b) and 6(3)(c): improving the result of a previously completed human activity, or detecting patterns without replacing or influencing the human assessment.',
    keywords: ['suggest', 'recommend', 'draft', 'assist', 'propose', 'flag'],
    patterns: [
      /\b(suggest\w*|recommend\w*|propose\w*|draft)[_\s]?(only|for[_\s]?review|to[_\s]?(user|reviewer|human))\b/i,
      /\b(requires?|needs?|awaiting)[_\s]?(human|manual|reviewer)[_\s]?(approval|confirmation|action|sign[_\s]?off)\b/i,
      /\b(flag(ged)?[_\s]?for[_\s]?review|for_review|needs_review|pending_review)\b/i,
    ],
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
  defineSignal({
    id: 'domain.profiling',
    label: 'Profiling of natural persons',
    category: 'domain',
    description:
      'Automated processing of personal data to evaluate personal aspects — performance, economic situation, health, preferences, reliability, behaviour, location or movements. GDPR Article 4(4). Its presence permanently closes the Article 6(3) derogation, by the final subparagraph of that Article.',
    keywords: ['profile', 'segment', 'persona', 'behaviour', 'behavior', 'propensity'],
    patterns: [
      /\b(user|customer|candidate|applicant|employee|person)[_\s]?(profile|profiling|segment\w*|persona|score)\b/i,
      /\b(profil\w+)[_\s]?(user|customer|person|individual|behaviou?r)\b/i,
      /\b(propensity|churn|risk|credit|trust|reliability)[_\s]?(score|model|rating)\b/i,
      /\b(predict|infer|estimate)[_\s]?(income|health|preference|location|behaviou?r|performance)\b/i,
    ],
    fileGuard: corroborate(['profile', 'score', 'user', 'customer', 'person', 'predict', 'segment'], 2),
    maxEvidence: 8,
    scope: 'code',
    excludePaths: NOT_TEST_DATA,
    ignoreComments: true,
  }),
];
