import type { RiskTier } from '../types.js';

/**
 * The benchmark corpus.
 *
 * Every case is a hand-labelled miniature repository with the classification a
 * competent reader of the Act would give it. Half the corpus exists to catch
 * *false positives*: systems that look like an Annex III use case to a keyword
 * matcher but are expressly carved out, or that involve AI with no regulated
 * use case at all.
 *
 * The labels are the honest part of this product. `npm run benchmark` prints
 * precision and recall including the cases Annex gets wrong, and those numbers
 * go in the README unedited.
 */

export interface BenchmarkCase {
  id: string;
  /** What a lawyer would call this system. */
  description: string;
  files: Record<string, string>;
  /** The tier a competent reader of the Act would assign. */
  tier: RiskTier;
  /** Classification finding ids that must fire. */
  expectFindings?: string[];
  /** Classification finding ids that must NOT fire — the carve-outs. */
  forbidFindings?: string[];
  /** Why the label is what it is. Shown in the benchmark report. */
  rationale: string;
}

const pkg = (name: string, deps: Record<string, string> = { openai: '^4.0.0' }) =>
  JSON.stringify({ name, dependencies: deps }, null, 2);

const OPENAI_CALL = `import OpenAI from 'openai';
const client = new OpenAI();
export const infer = (p: string) =>
  client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: p }] });
`;

const SKLEARN_CALL = `from sklearn.ensemble import GradientBoostingClassifier

model = GradientBoostingClassifier()

def predict(features):
    return model.predict_proba(features)[:, 1]
`;

export const BENCHMARK: BenchmarkCase[] = [
  // =======================================================================
  // Prohibited practices — Article 5
  // =======================================================================
  {
    id: 'prohibited.emotion-hiring',
    description: 'Video interview platform inferring candidate emotion',
    tier: 'prohibited',
    expectFindings: ['art5.1f.emotion-workplace'],
    rationale:
      'Art. 5(1)(f) prohibits inferring emotions of a natural person in the areas of workplace and education institutions. Recruitment is within the workplace limb.',
    files: {
      'package.json': pkg('interviewiq'),
      'src/interview.ts': `${OPENAI_CALL}
export async function scoreInterview(frames: string[], applicantId: string) {
  const emotionScore = await detectEmotion(frames);
  return { applicantId, candidateScore: emotionScore.enthusiasmLevel };
}
export async function detectEmotion(frames: string[]) {
  return { enthusiasmLevel: 0.7, dominantEmotion: 'engaged' };
}
`,
      'src/pipeline.ts': `export function rankCandidates(applicants: { id: string; resumeText: string }[]) {
  return applicants.sort((a, b) => a.id.localeCompare(b.id));
}
`,
    },
  },
  {
    id: 'prohibited.emotion-classroom',
    description: 'Attention monitoring in an online classroom',
    tier: 'prohibited',
    expectFindings: ['art5.1f.emotion-workplace'],
    rationale: 'Art. 5(1)(f) covers education institutions as well as workplaces.',
    files: {
      'package.json': pkg('focusly'),
      'src/attention.py': `def analyze_emotion(webcam_frames):
    """Infer student engagement from facial expression."""
    emotion_state = classify_emotion(webcam_frames)
    return {"student_score": emotion_state["engagement"], "exam_monitor": True}
`,
      'src/exam.py': `def student_grade(submission):
    return auto_grading(submission)
`,
    },
  },
  {
    id: 'prohibited.face-scraping',
    description: 'Facial recognition database built by crawling the web',
    tier: 'prohibited',
    expectFindings: ['art5.1e.face-scraping'],
    rationale: 'Art. 5(1)(e) prohibits creating or expanding facial recognition databases by untargeted scraping.',
    files: {
      'package.json': pkg('faceindex', { playwright: '^1.49.0' }),
      'src/crawler.py': `def crawl_profile_photos(seed_urls):
    """Scrape facial images from public profiles into the face database."""
    for url in seed_urls:
        images = harvest_headshots(url)
        face_database.ingest(face_embedding(images))
`,
    },
  },
  {
    id: 'prohibited.social-scoring',
    description: 'Tenant trustworthiness score used across unrelated services',
    tier: 'prohibited',
    expectFindings: ['art5.1c.social-scoring'],
    rationale:
      'Art. 5(1)(c) reaches scoring of natural persons on social behaviour where it causes detrimental treatment in unrelated contexts. Annex flags it for human determination rather than deciding the "unrelated context" question itself.',
    files: {
      'package.json': pkg('trustrank'),
      'src/score.ts': `${OPENAI_CALL}
export function computeTrustScore(person: { historyMonths: number }) {
  const socialScore = person.historyMonths * 0.1;
  return { trust_score: socialScore, reputation_score: socialScore };
}
`,
    },
  },

  // =======================================================================
  // High risk — Annex III
  // =======================================================================
  {
    id: 'high.recruitment',
    description: 'Resume screening that filters applicants before a recruiter sees them',
    tier: 'high',
    expectFindings: ['annex-iii.4a.recruitment'],
    rationale: 'Annex III, point 4(a): analysing and filtering job applications and evaluating candidates.',
    files: {
      'package.json': pkg('screenly'),
      'src/screen.ts': `${OPENAI_CALL}
export async function screenApplicant(resume: string, jobPosting: string) {
  const candidateScore = await scoreResume(resume, jobPosting);
  const decision = candidateScore > 0.6 ? 'advance' : 'reject';
  return { candidateScore, decision };
}
async function scoreResume(resume: string, posting: string) { return 0.5; }
`,
    },
  },
  {
    id: 'high.worker-monitoring',
    description: 'Warehouse productivity scoring used in termination decisions',
    tier: 'high',
    expectFindings: ['annex-iii.4b.worker-management'],
    rationale: 'Annex III, point 4(b): monitoring and evaluating performance and behaviour in work relationships.',
    files: {
      'package.json': pkg('shiftwise'),
      'src/productivity.py': `${SKLEARN_CALL}

def employee_performance_score(worker_id, shift_events):
    """Score each worker's productivity for the weekly review."""
    features = build_features(shift_events)
    return {"worker_score": predict(features), "termination_risk": predict(features)}
`,
    },
  },
  {
    id: 'high.credit',
    description: 'Consumer loan underwriting model',
    tier: 'high',
    expectFindings: ['annex-iii.5b.credit'],
    rationale: 'Annex III, point 5(b): evaluating creditworthiness or establishing a credit score.',
    files: {
      'pyproject.toml': '[project]\nname = "creditcore"\ndependencies = ["scikit-learn==1.6.0"]\n',
      'src/underwrite.py': `${SKLEARN_CALL}

def credit_score(application):
    """Evaluate creditworthiness for a consumer loan."""
    pd = predict(build_features(application))
    return {"probability_of_default": pd, "loan_decision": "approve" if pd < 0.3 else "decline"}
`,
    },
  },
  {
    id: 'high.insurance',
    description: 'Life insurance premium pricing model',
    tier: 'high',
    expectFindings: ['annex-iii.5c.insurance'],
    rationale: 'Annex III, point 5(c): risk assessment and pricing for life and health insurance.',
    files: {
      'pyproject.toml': '[project]\nname = "actuary"\ndependencies = ["scikit-learn==1.6.0"]\n',
      'src/pricing.py': `${SKLEARN_CALL}

def insurance_premium(policyholder):
    """Actuarial pricing for a life insurance policy."""
    return {"insurance_risk": predict(policyholder), "premium": 42.0}
`,
    },
  },
  {
    id: 'high.benefits',
    description: 'Municipal housing benefit eligibility engine',
    tier: 'high',
    expectFindings: ['annex-iii.5a.public-benefits'],
    rationale: 'Annex III, point 5(a): evaluating eligibility for essential public assistance benefits.',
    files: {
      'package.json': pkg('benefitsflow'),
      'src/eligibility.ts': `${OPENAI_CALL}
export function benefitEligibility(claimant: { income: number }) {
  const welfare_decision = claimant.income < 18000 ? 'approve' : 'reject';
  return { benefit_eligibility: welfare_decision, means_test: true };
}
`,
    },
  },
  {
    id: 'high.triage',
    description: 'Emergency department patient triage assistant',
    tier: 'high',
    expectFindings: ['annex-iii.5d.emergency-triage'],
    rationale: 'Annex III, point 5(d): patient triage and prioritising emergency first response.',
    files: {
      'package.json': pkg('triagenow'),
      'src/triage.ts': `${OPENAI_CALL}
export async function triage(symptoms: string[], patientId: string) {
  const patientSeverity = await classifySymptoms(symptoms);
  return { patientId, triage_priority: patientSeverity, clinical_decision: 'see now' };
}
async function classifySymptoms(s: string[]) { return 3; }
`,
    },
  },
  {
    id: 'high.education-admission',
    description: 'University admissions ranking',
    tier: 'high',
    expectFindings: ['annex-iii.3.education'],
    rationale: 'Annex III, point 3(a): determining access or admission to educational institutions.',
    files: {
      'package.json': pkg('admitly'),
      'src/admissions.ts': `${OPENAI_CALL}
export function admissionDecision(student: { gpa: number; essay: string }) {
  const student_score = student.gpa / 4;
  return { admission_decision: student_score > 0.8 ? 'offer' : 'reject', enrollment_ranking: student_score };
}
`,
    },
  },
  {
    id: 'high.biometric-id',
    description: 'One-to-many face identification at a stadium entrance',
    tier: 'high',
    expectFindings: ['annex-iii.1a.biometric-id'],
    rationale: 'Annex III, point 1(a): remote biometric identification systems.',
    files: {
      'requirements.txt': 'face_recognition==1.3.0\nnumpy==2.1.0\n',
      'src/gate.py': `import face_recognition

def identify_person(frame, gallery):
    """Match a face against the watchlist gallery."""
    encoding = face_recognition.face_encodings(frame)[0]
    return face_recognition.compare_faces(gallery, encoding)
`,
    },
  },
  {
    id: 'high.migration',
    description: 'Visa application risk assessment',
    tier: 'high',
    expectFindings: ['annex-iii.7.migration'],
    rationale: 'Annex III, point 7(c): assisting in the examination of applications for asylum, visa or residence permits.',
    files: {
      'package.json': pkg('bordercheck'),
      'src/visa.ts': `${OPENAI_CALL}
export async function assessVisaApplication(app: { country: string }) {
  return { visa_risk: await infer('assess ' + app.country), asylum_application: false };
}
`,
    },
  },
  {
    id: 'high.justice',
    description: 'Judicial research assistant applying law to facts',
    tier: 'high',
    expectFindings: ['annex-iii.8a.justice'],
    rationale: 'Annex III, point 8(a): assisting a judicial authority in researching and interpreting facts and law.',
    files: {
      'package.json': pkg('benchmate'),
      'src/bench.ts': `${OPENAI_CALL}
export async function judicialDecisionSupport(caseFile: string) {
  return { court_recommendation: await infer(caseFile), sentencing_recommendation: 'custodial' };
}
`,
    },
  },

  // =======================================================================
  // Transparency — Article 50
  // =======================================================================
  {
    id: 'transparency.chatbot',
    description: 'Customer support chatbot with no AI disclosure',
    tier: 'transparency',
    expectFindings: ['art50.1.chat-disclosure'],
    forbidFindings: ['annex-iii.4a.recruitment', 'annex-iii.5b.credit'],
    rationale:
      'Art. 50(1): a system intended to interact directly with natural persons. No Annex III use case, so it is not high-risk.',
    files: {
      'package.json': pkg('helpbot'),
      'src/chat.tsx': `import { useState } from 'react';
export function ChatWindow() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  return <div className="chat-window"><MessageList messages={messages} /></div>;
}
function MessageList({ messages }: { messages: unknown[] }) { return null; }
`,
      'src/api.ts': OPENAI_CALL,
    },
  },
  {
    id: 'transparency.image-gen',
    description: 'Marketing image generator with no content marking',
    tier: 'transparency',
    expectFindings: ['art50.2.synthetic-content'],
    rationale: 'Art. 50(2): a system generating synthetic image content must mark outputs machine-readably.',
    files: {
      'package.json': pkg('adforge'),
      'src/generate.ts': `${OPENAI_CALL}
export async function textToImage(prompt: string) {
  return fetch('https://api.openai.com/v1/images/generations', { method: 'POST', body: prompt });
}
`,
    },
  },
  {
    id: 'transparency.voice-clone',
    description: 'Voice cloning for audiobook narration',
    tier: 'transparency',
    expectFindings: ['art50.2.synthetic-content'],
    rationale: 'Art. 50(2) covers synthetic audio.',
    files: {
      'package.json': pkg('narrate', { elevenlabs: '^1.0.0' }),
      'src/tts.ts': `export async function voiceClone(sample: Buffer, text: string) {
  return synthesizeSpeech(sample, text);
}
async function synthesizeSpeech(s: Buffer, t: string) { return Buffer.from(''); }
`,
    },
  },

  // =======================================================================
  // Carve-outs — these look high-risk to a keyword matcher and are not
  // =======================================================================
  {
    id: 'carveout.fraud-detection',
    description: 'Card transaction fraud detection',
    tier: 'minimal',
    forbidFindings: ['annex-iii.5b.credit'],
    rationale:
      'Annex III, point 5(b) expressly excludes AI systems used for the purpose of detecting financial fraud. A scanner that keys on "credit" alone fails this case.',
    files: {
      'pyproject.toml': '[project]\nname = "fraudguard"\ndependencies = ["scikit-learn==1.6.0"]\n',
      'src/fraud.py': `${SKLEARN_CALL}

def detect_card_fraud(transaction):
    """Flag anomalous card transactions for the fraud operations team."""
    return {"fraud_probability": predict(transaction), "action": "hold" }
`,
    },
  },
  {
    id: 'carveout.identity-verification',
    description: "One-to-one face match against the user's own passport photo",
    tier: 'minimal',
    forbidFindings: ['annex-iii.1a.biometric-id'],
    rationale:
      'Annex III, point 1(a) excludes biometric verification whose sole purpose is confirming that a person is who they claim to be. Annex flags it for review rather than asserting high risk.',
    files: {
      'requirements.txt': 'deepface==0.0.93\nnumpy==2.1.0\n',
      'src/verify.py': `from deepface import DeepFace


def verify_identity(selfie_path, passport_photo_path):
    """One-to-one verification: the user asserts an identity and we confirm it.

    No gallery is searched and no watchlist is consulted, so this is outside
    Annex III, point 1(a).
    """
    result = DeepFace.verify(selfie_path, passport_photo_path)
    return {"match": result["verified"], "gallery_search": False}
`,
    },
  },
  {
    id: 'carveout.product-ranking',
    description: 'E-commerce product recommendation ranking',
    tier: 'transparency',
    forbidFindings: ['annex-iii.4a.recruitment', 'art5.1c.social-scoring'],
    rationale:
      'Ranking products is not ranking people, so no Annex III use case applies. The repository still calls a model that generates text, which engages Art. 50(2) — the point of this case is that Annex must not promote it to high-risk.',
    files: {
      'package.json': pkg('shoprank'),
      'src/rank.ts': `${OPENAI_CALL}
export function rankProducts(products: { sku: string; score: number }[]) {
  return products.sort((a, b) => b.score - a.score);
}
`,
    },
  },
  {
    id: 'carveout.expense-ocr',
    description: 'Expense receipt OCR for finance teams',
    tier: 'minimal',
    forbidFindings: ['annex-iii.4b.worker-management'],
    rationale:
      'Reading a receipt submitted by an employee is a narrow procedural task, not monitoring or evaluating performance and behaviour.',
    files: {
      'package.json': pkg('receipts'),
      'src/ocr.ts': `${OPENAI_CALL}
export async function extractReceipt(image: string) {
  return { merchant: 'X', amount: 12.5, employeeId: 'e1', currency: 'EUR' };
}
`,
    },
  },
  {
    id: 'carveout.wellbeing-journal',
    description: 'Consumer mood journalling app',
    tier: 'high',
    expectFindings: ['annex-iii.1c.emotion'],
    forbidFindings: ['art5.1f.emotion-workplace'],
    rationale:
      'Emotion inference outside a workplace or education setting is Annex III, point 1(c) high-risk, not an Art. 5(1)(f) prohibition. Getting this boundary right is the difference between "fix this" and "this is illegal".',
    files: {
      'package.json': pkg('moodlog'),
      'src/mood.ts': `${OPENAI_CALL}
export async function detectEmotion(entry: string) {
  return { mood_state: await infer(entry), emotion_score: 0.4 };
}
`,
    },
  },
  {
    id: 'carveout.spam-filter',
    description: 'Email spam classifier',
    tier: 'minimal',
    rationale: 'Classifying mail is not a listed use case. Art. 4 and Art. 5 still apply; nothing else does.',
    files: {
      'pyproject.toml': '[project]\nname = "spamcatch"\ndependencies = ["scikit-learn==1.6.0"]\n',
      'src/spam.py': `${SKLEARN_CALL}

def classify_message(message):
    return {"spam": predict(message) > 0.8}
`,
    },
  },
  {
    id: 'carveout.code-assistant',
    description: 'IDE code completion assistant',
    tier: 'transparency',
    forbidFindings: ['annex-iii.4a.recruitment', 'annex-iii.8a.justice'],
    rationale:
      'Generates synthetic text content, so Art. 50(2) is engaged. No Annex III use case. Annex should not invent one.',
    files: {
      'package.json': pkg('codepilot'),
      'src/complete.ts': `${OPENAI_CALL}
export async function completeCode(prefix: string) {
  return infer(prefix);
}
`,
    },
  },
  {
    id: 'carveout.translation',
    description: 'Document translation service',
    tier: 'transparency',
    forbidFindings: ['annex-iii.3.education', 'annex-iii.8a.justice'],
    rationale: 'Translation generates text, engaging Art. 50(2). It is not a listed high-risk use case.',
    files: {
      'package.json': pkg('lingua'),
      'src/translate.ts': `${OPENAI_CALL}
export async function translate(text: string, target: string) {
  return infer('Translate to ' + target + ':\\n' + text);
}
`,
    },
  },
  {
    id: 'carveout.game-npc',
    description: 'Game NPC dialogue generation',
    tier: 'transparency',
    forbidFindings: ['annex-iii.4a.recruitment', 'art5.1c.social-scoring'],
    rationale: 'Generates dialogue text. Art. 50(2) applies; Art. 50(4) is limited for evidently fictional works.',
    files: {
      'package.json': pkg('npcforge'),
      'src/npc.ts': `${OPENAI_CALL}
export async function npcDialogue(character: string, playerLine: string) {
  return infer(character + ' responds to: ' + playerLine);
}
`,
    },
  },
  {
    id: 'carveout.internal-analytics',
    description: 'SQL generation over an internal analytics warehouse',
    tier: 'transparency',
    forbidFindings: ['annex-iii.5b.credit', 'annex-iii.4b.worker-management'],
    rationale: 'Generating SQL for an analyst is text generation, not a decision about a person.',
    files: {
      'package.json': pkg('askdata'),
      'src/sql.ts': `${OPENAI_CALL}
export async function generateSql(question: string, schema: string) {
  return infer('Schema:\\n' + schema + '\\n\\nQuestion: ' + question);
}
`,
    },
  },
  {
    id: 'negative.no-ai',
    description: 'A plain CRUD web application with no AI at all',
    tier: 'unknown',
    forbidFindings: ['art50.1.chat-disclosure', 'annex-iii.4a.recruitment'],
    rationale: 'No AI system is present. Annex must say so rather than finding something to flag.',
    files: {
      'package.json': JSON.stringify({ name: 'todo', dependencies: { express: '^4.21.0' } }, null, 2),
      'src/server.ts': `import express from 'express';
const app = express();
app.get('/todos', (_req, res) => res.json([]));
app.post('/todos', (req, res) => res.status(201).json(req.body));
app.listen(3000);
`,
    },
  },
  {
    id: 'negative.docs-only',
    description: 'A documentation site that discusses AI regulation',
    tier: 'unknown',
    forbidFindings: ['annex-iii.4a.recruitment', 'art50.1.chat-disclosure', 'art5.1f.emotion-workplace'],
    rationale:
      'Writing about emotion recognition in hiring is not doing it. A scanner that cannot tell prose from code is useless on any real repository.',
    files: {
      'package.json': JSON.stringify({ name: 'ai-law-blog', dependencies: { astro: '^5.0.0' } }, null, 2),
      'content/emotion-recognition.md': `# Emotion recognition in hiring

Article 5(1)(f) of the EU AI Act prohibits the use of AI systems to infer
emotions of a natural person in the areas of workplace and education
institutions. This means a video interview platform that scores candidate
enthusiasm or detects applicant affect is prohibited outright, not merely
high-risk. Recruiters ranking resumes by candidate score face Annex III,
point 4(a) instead.
`,
      'content/credit-scoring.md': `# Credit scoring under Annex III

Evaluating creditworthiness of natural persons or establishing a credit score
is high-risk under Annex III, point 5(b), except where the system is used for
detecting financial fraud.
`,
    },
  },
];

export const BENCHMARK_SIZE = BENCHMARK.length;
