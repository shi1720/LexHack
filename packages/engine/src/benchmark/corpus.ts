import type { RiskTier, SystemProfile } from '../types.js';

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
  /**
   * Operator-supplied facts for this case. Some determinations are not in the
   * code by construction — the Article 6(3) derogation is one an operator
   * claims — and a benchmark that cannot express them cannot test them.
   */
  profile?: Partial<SystemProfile>;
  /** The tier a competent reader of the Act would assign. */
  tier: RiskTier;
  /** Classification finding ids that must fire. */
  expectFindings?: string[];
  /** Classification finding ids that must NOT fire — the carve-outs. */
  forbidFindings?: string[];
  /** Why the label is what it is. Shown in the benchmark report. */
  rationale: string;
  /**
   * What this case caught, where it caught something.
   *
   * A clean sheet on a self-authored corpus is close to zero evidence on its
   * own, and saying so in a caveat is cheap. What is not cheap is the list of
   * defects the corpus has actually found — a case whose label was wrong when
   * it was written, or a detector it falsified. Recording those keeps the
   * 100 % honest: it is 100 % *after* the corpus did its job, and the report
   * prints the job.
   */
  caught?: string;
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
  {
    id: 'carveout.prose-in-block-comments',
    description: 'Service whose design note and docstring list the AI features it rejected',
    tier: 'unknown',
    forbidFindings: ['annex-iii.4a.recruitment', 'annex-iii.1c.emotion', 'art5.1f.emotion-workplace', 'art5.1g.biometric-categorisation'],
    rationale:
      'The first version of the comment fix only skipped lines that *begin* with a marker, which left the interior of a block comment and of a Python docstring looking exactly like code. A repository containing nothing but prose classified high-risk and cited the sentence saying the opposite as its evidence. This case is the one the earlier corpus case should have been. The expected tier is `unknown` because there is no AI code here at all — only prose about AI, which is exactly the point.',
    files: {
      'package.json': pkg('prose-only'),
      'src/notes.ts': `/*
 * Design note.
 *
 * We deliberately do NOT do emotion detection on candidates, and we do not
 * score or rank applicants. Facial expression analysis and micro-expression
 * recognition were both rejected during design review.
 */
export const REJECTED_FEATURES = 6;
`,
      'src/policy.py': `def policy():
    """
    Our policy: no emotion recognition, no affect detection, no candidate
    scoring, no applicant ranking, no biometric categorisation by ethnicity.
    """
    return None
`,
    },
  },

  {
    id: 'carveout.prose-in-comments',
    description: 'Payments service whose comments explain the AI rules it deliberately avoids',
    tier: 'transparency',
    forbidFindings: ['annex-iii.4a.recruitment', 'annex-iii.1c.emotion', 'art5.1f.emotion-workplace'],
    rationale:
      'A comment is prose that happens to live in a .ts file. Annex found this case by scanning itself and classifying itself as an emotion-recognition system on the strength of a comment describing a test fixture. Domain detectors now skip comment-only lines, so none of the Annex III findings fire; a trailing comment on a real line of code still counts, because the claim rests on the code half. The Article 50 transparency duty is real and stays.',
    files: {
      'package.json': pkg('payments'),
      'src/charge.ts': `${OPENAI_CALL}
// This service deliberately does NOT rank candidates, screen applicants, or
// infer candidate emotion from video interviews. Those are Annex III point
// 4(a) and Article 5(1)(f) territory and we keep well clear of them.
//
// See docs/compliance.md for the hiring-adjacent features we rejected:
// resume scoring, shortlist ranking and interview sentiment analysis.
export async function charge(customerId: string, amountMinor: number) {
  return { customerId, amountMinor, status: 'captured' };
}
`,
    },
  },

  // =======================================================================
  // Hard cases. These exist to find the edge of what static analysis can
  // decide, not to be passed. Where Annex gets one wrong the benchmark says
  // so, in the README, unedited.
  // =======================================================================
  {
    id: 'hard.obvious-ai-chatbot',
    description: 'Chat widget branded "AI Assistant" throughout the interface',
    tier: 'transparency',
    expectFindings: ['art50.1.chat-disclosure'],
    rationale:
      'Article 50(1) does not apply where it is obvious to a reasonably well-informed, observant and circumspect natural person that they are interacting with an AI system. Whether branding makes it obvious is a judgement about a reader, not a fact about a file — Annex should raise the duty and say the carve-out has to be assessed, not silently decide either way.',
    files: {
      'package.json': pkg('assistant-widget'),
      'src/widget.ts': `${OPENAI_CALL}
const systemPrompt = 'You are the AI Assistant for Acme.';

export async function sendMessage(text: string) {
  const chatResponse = await infer(systemPrompt + text);
  return { role: 'assistant', content: chatResponse, widgetTitle: 'AI Assistant' };
}
`,
    },
  },
  {
    id: 'hard.biometric-hair-colour',
    description: 'Photo app that groups portraits by hair colour',
    tier: 'transparency',
    forbidFindings: ['art5.1g.biometric-categorisation'],
    rationale:
      'Article 5(1)(g) prohibits biometric categorisation that deduces race, political opinions, trade union membership, religious or philosophical beliefs, sex life or sexual orientation. Hair colour is none of those, and a rule that fires on the word "categorise" next to the word "face" would be unusable.',
    files: {
      'package.json': pkg('photo-groups'),
      'src/group.ts': `${OPENAI_CALL}
export async function groupPortraits(faces: string[]) {
  return faces.map((f) => ({ face: f, categorise: 'hair_colour', bucket: 'brown' }));
}
`,
    },
  },
  {
    id: 'hard.driver-drowsiness',
    description: 'In-car camera detecting driver drowsiness',
    tier: 'minimal',
    forbidFindings: ['art5.1f.emotion-workplace', 'annex-iii.1c.emotion'],
    rationale:
      'Recital 18 is explicit that the notion of emotion recognition does not include physical states such as pain or fatigue, "including, for example, systems used in detecting the state of fatigue of professional pilots or drivers for the purpose of preventing accidents". Fatigue never enters the Article 3(39) definition, so this is not an Article 5(1)(f) exemption case — the provision is not engaged at all. As a safety component of a vehicle it is an Annex I product, and Article 2(2) limits the Act to Article 6(1), Articles 102-109 and Article 112 for those, so the Chapter III stack does not attach either.',
    files: {
      'package.json': pkg('drowsiness', { 'scikit-learn': '^1.4.0' }),
      'detect.py': `${SKLEARN_CALL}


def detect_drowsiness(frame):
    """Safety feature: infer driver fatigue from eyelid closure and alert."""
    emotion_state = predict([frame])[0]
    return {"drowsy": emotion_state > 0.6, "safety_alert": True, "vehicle_speed_limiter": True}
`,
    },
  },
  {
    id: 'hard.regulated-use-in-sql-only',
    description: 'Lending model called from Python, with the use case visible only in SQL',
    tier: 'high',
    expectFindings: ['annex-iii.5b.credit'],
    rationale:
      'Not every regulated use case is written in application code. The inference lives in a two-line Python module; everything that makes it creditworthiness assessment is in a stored procedure. A scanner that reads only the languages it likes would call this minimal-risk.',
    files: {
      'package.json': pkg('lending-db', { 'scikit-learn': '^1.4.0' }),
      'score.py': `${SKLEARN_CALL}


def run(features):
    return predict(features)
`,
      'db/decide.sql': `-- Creditworthiness scoring for consumer loan applicants.
CREATE PROCEDURE score_applicant(IN borrower_id INT)
BEGIN
  SELECT credit_score, loan_decision, underwriting_outcome
  FROM loan_applications
  WHERE applicant_id = borrower_id AND credit_score < 600;
END;
`,
    },
  },
  {
    id: 'hard.vendored-copy',
    description: 'Unrelated product that vendors a third-party hiring SDK it never calls',
    tier: 'transparency',
    forbidFindings: ['annex-iii.4a.recruitment'],
    rationale:
      'A vendored dependency sitting in the tree is not a use case the repository owner operates. Treating vendor directories as the system under assessment is how a scanner ends up classifying its own node_modules.',
    files: {
      'package.json': pkg('unrelated-app'),
      'src/app.ts': `${OPENAI_CALL}
const systemPrompt = 'Summarise this changelog.';

export async function summarise(text: string) {
  return infer(systemPrompt + text);
}
`,
      'vendor/hire-sdk/screen.ts': `export function scoreCandidate(resume: string) {
  return { applicant: true, shortlist: true, hiring_decision: 'advance', candidate: resume };
}
`,
    },
  },

  // =======================================================================
  // Article 6(3) — the derogation most real Annex III conversations turn on
  // =======================================================================
  {
    id: 'derogation.narrow-procedural-claimed',
    description: 'Routes inbound CVs to the right requisition by job family, with no scoring',
    tier: 'minimal',
    profile: { article6_3Derogation: 'narrow-procedural' },
    expectFindings: ['annex-iii.4a.recruitment'],
    rationale:
      'Annex III point 4(a) is engaged on the face of it — the finding fires and stays in the record — but the operator has claimed the Article 6(3)(a) narrow-procedural-task derogation and no profiling of natural persons appears in the code, so the tier drops. The Article 6(4) documentation duty and the Article 49(2) registration duty survive the claim. Without the finding firing, this case would pass for the wrong reason, which is what it did until a test went looking.',
    files: {
      'package.json': pkg('cv-router', { 'scikit-learn': '^1.4.0' }),
      'router.py': `${SKLEARN_CALL}


def parse_resume(resume_text):
    """Extract structured fields from an applicant CV."""
    return {"skills": [], "years": 0}


def route_applicant(resume_text, candidate_id, job_requisition):
    """Place an applicant CV on the right requisition queue. No ranking."""
    parsed = parse_resume(resume_text)
    return {"job_requisition": job_requisition, "candidate_id": candidate_id, "applicant": True, "parsed": parsed}
`,
    },
  },
  {
    id: 'derogation.blocked-by-profiling',
    description: 'CV router that also builds a candidate profile and a propensity score',
    tier: 'high',
    profile: { article6_3Derogation: 'narrow-procedural' },
    expectFindings: ['annex-iii.4a.recruitment'],
    rationale:
      'The final subparagraph of Article 6(3) closes the derogation for any system performing profiling of natural persons, whichever limb is relied on. Claiming it here must not demote the system.',
    files: {
      'package.json': pkg('cv-router-plus', { 'scikit-learn': '^1.4.0' }),
      'router.py': `${SKLEARN_CALL}


def build_candidate_profile(resume_text):
    """User profile: segment the person and predict performance."""
    return {"segment_user": "senior", "predict_performance": 0.7, "user_profile": resume_text}


def parse_resume(resume_text):
    """Extract structured fields from an applicant CV."""
    return {"skills": [], "years": 0}


def score_candidate(resume_text, applicant_id, job_requisition):
    candidate_profile = build_candidate_profile(resume_text)
    propensity_score = predict([resume_text])[0]
    return {"applicant_id": applicant_id, "shortlist": propensity_score > 0.7, "candidate_profile": candidate_profile, "job_requisition": job_requisition}
`,
    },
  },
  {
    id: 'derogation.claimed-but-not-annex-iii',
    description: 'Internal document tagger that claims a derogation it does not need',
    tier: 'minimal',
    profile: { article6_3Derogation: 'preparatory' },
    rationale:
      'A derogation from a classification the system never had is not a finding. Annex records that the claim had nothing to displace rather than reporting a successful derogation.',
    files: {
      'package.json': pkg('doc-tagger', { 'scikit-learn': '^1.4.0' }),
      'tagger.py': `${SKLEARN_CALL}


def tag_document(text):
    return {"tags": ["policy", "finance"], "confidence": float(predict([text])[0])}
`,
    },
  },

  // =======================================================================
  // Article 50(2) — the "does not substantially alter the input" carve-out
  // =======================================================================
  {
    id: 'carveout.invoice-ocr',
    description: 'Invoice OCR that returns the fields printed on the page',
    tier: 'minimal',
    forbidFindings: ['art50.2.generated-text'],
    rationale:
      'Article 50(2) does not apply where the system does not substantially alter the input data or its semantics. Transcribing an invoice is re-expression, not generation.',
    files: {
      'package.json': pkg('invoice-ocr'),
      'src/ocr.ts': `${OPENAI_CALL}
export async function extractInvoice(image: string) {
  const ocrText = await infer('extract text');
  return { extractField: true, parseDocument: ocrText, total: 0 };
}
`,
    },
  },
  {
    id: 'carveout.ocr-that-also-drafts',
    description: 'Invoice OCR that also drafts the chase email',
    tier: 'transparency',
    expectFindings: ['art50.2.generated-text'],
    rationale:
      'The carve-out is limb-specific, not product-specific. A pipeline that transcribes an invoice and then writes a new message to a person is generating synthetic text for that second output.',
    files: {
      'package.json': pkg('invoice-chaser'),
      'src/ocr.ts': `${OPENAI_CALL}
const systemPrompt = 'You are a polite accounts-receivable assistant.';

export async function extractInvoice(image: string) {
  return { extractField: true, parseDocument: await infer('extract text') };
}

export async function draftChaseEmail(invoice: unknown) {
  return infer(systemPrompt + ' Write a chase email.');
}
`,
    },
  },

  // =======================================================================
  // Annex III point 8(b) — the "not directly exposed" exclusion
  // =======================================================================
  {
    id: 'carveout.campaign-logistics',
    description: 'Rota and doorstep-route planner for a political campaign office',
    tier: 'minimal',
    forbidFindings: ['annex-iii.8b.elections'],
    rationale:
      'Point 8(b) expressly excludes systems to the output of which natural persons are not directly exposed, such as tools used to organise, optimise or structure political campaigns from an administrative or logistical point of view.',
    files: {
      'package.json': pkg('canvass-rota', { 'scikit-learn': '^1.4.0' }),
      'rota.py': `${SKLEARN_CALL}


def plan_routes(volunteers, streets):
    """Assign canvassing streets to volunteers for an election campaign office."""
    return [{"volunteer": v, "street": s} for v, s in zip(volunteers, streets)]
`,
    },
  },

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
    id: 'high.biometric-categorisation-age-gender',
    description: 'Digital-signage analytics that estimates the age and gender of passers-by from camera frames',
    tier: 'high',
    expectFindings: ['annex-iii.1b.biometric-categorisation'],
    forbidFindings: ['art5.1g.biometric-categorisation'],
    rationale:
      'Annex III, point 1(b): biometric categorisation according to sensitive or protected attributes inferred from biometric data. Sex and age are protected grounds in Union non-discrimination law, so this is high-risk — but neither is in the closed Article 5(1)(g) list, so it is not prohibited. That gap is the whole reason point 1(b) needs a rule of its own: with only the prohibition modelled, this system classified as minimal risk.',
    files: {
      'requirements.txt': 'opencv-python==4.10.0\ntensorflow==2.17.0\n',
      'src/audience.py': `import cv2

def analyse_frame(frame):
    """Estimate the demographics of whoever is looking at the screen."""
    faces = cv2.CascadeClassifier("haar.xml").detectMultiScale(frame)
    out = []
    for face in faces:
        age_estimation = AGE_MODEL.predict(face)
        gender_classifier_result = GENDER_MODEL.predict(face)
        out.append({"age": age_estimation, "gender": gender_classifier_result})
    return out
`,
    },
  },
  {
    id: 'carveout.demographics-without-biometrics',
    description: 'CRM enrichment that guesses gender from a first name and age from a date of birth',
    tier: 'minimal',
    forbidFindings: ['annex-iii.1b.biometric-categorisation', 'art5.1g.biometric-categorisation'],
    caught:
      'Fired on a gender classifier over names and an age inference from a date-of-birth column, with no biometrics anywhere — switching on the whole Chapter III stack, Article 49 registration and Article 86. The modality guard in `domain.biometric.categorisation` came from this case.',
    rationale:
      'Article 3(40) defines biometric categorisation as assigning people to categories **on the basis of their biometric data**, and Annex III point 1 is the biometrics point. A name and a date of birth are personal data and are not biometric data, so neither point 1(b) nor Article 5(1)(g) is engaged — this is a GDPR problem, not an AI Act high-risk classification. Without the modality guard the attribute keywords alone switched on the whole Chapter III stack, Article 49 registration and Article 86.',
    files: {
      'requirements.txt': 'scikit-learn==1.5.0\n',
      'src/enrich.py': `def enrich(user):
    """Fill in the gaps in a CRM record."""
    gender_prediction = NAME_MODEL.predict(user["first_name"])
    age_estimation = int((today - user["date_of_birth"]).days / 365)
    return {"gender": gender_prediction, "age": age_estimation}
`,
    },
  },
  {
    id: 'carveout.biometric-categorisation-not-protected',
    description: 'Warehouse camera that counts how many people on the floor are wearing a hard hat',
    tier: 'minimal',
    forbidFindings: ['annex-iii.1b.biometric-categorisation', 'art5.1g.biometric-categorisation'],
    caught:
      'Its own label. It was written as `transparency` and the system shows nobody anything and generates nothing, so no Article 50 duty is engaged and `minimal` is the answer.',
    rationale:
      'Point 1(b) reaches categorisation according to a *sensitive or protected* attribute. Personal protective equipment is not an attribute of the person at all, and a rule that fired on any camera that sorted people into buckets would make every safety system in a warehouse high-risk. Minimal rather than transparency: the system shows nobody anything and generates nothing, so no Article 50 duty is engaged either — it was labelled transparency when it was written, which the benchmark caught.',
    files: {
      'requirements.txt': 'opencv-python==4.10.0\n',
      'src/ppe.py': `import cv2

def count_hard_hats(frame):
    """Count how many people on the floor are wearing a hard hat."""
    people = DETECTOR.detect(frame)
    return sum(1 for person in people if HARD_HAT_MODEL.predict(person) > 0.5)
`,
    },
  },
  {
    id: 'carveout.biometric-not-remote',
    description: 'Office door controller that matches a fingerprint at the reader',
    tier: 'unknown',
    forbidFindings: ['annex-iii.1a.biometric-id'],
    rationale:
      'Annex III point 1(a) reaches **remote** biometric identification, and Article 3(41) defines that as identification "without their active involvement, typically at a distance". Somebody walking up to a door and presenting a finger is the opposite of that. The rule carried the one-to-one verification carve-out and not the remoteness requirement, so every fingerprint reader in the corpus classified as high-risk. The tier is `unknown` rather than `minimal` for a second reason worth keeping separate: template matching against an enrolled set is not obviously an AI system under Article 3(1) at all, and nothing here infers anything from input in the way that definition requires.',
    files: {
      'requirements.txt': 'pyfingerprint==0.3.0\\n',
      'src/door.py': `def unlock(door_id):
    """The holder presents a finger at the reader beside the door."""
    template = FINGERPRINT_READER.capture()
    if biometric_template_match(template, enrolled_templates(door_id)):
        return open_door(door_id)
    return deny(door_id)
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
    tier: 'transparency',
    forbidFindings: ['annex-iii.1c.emotion', 'art5.1f.emotion-workplace'],
    caught:
      'Its own label, again. The case was labelled high-risk in an earlier version of the corpus — which is how a benchmark can be at 100 % and still be wrong.',
    rationale:
      'Article 3(39) defines an emotion recognition system as one inferring emotions or intentions **on the basis of biometric data**, and Annex III point 1(c) uses that defined term. Sentiment over text a person typed is not biometric data, so neither the high-risk classification nor the Article 5(1)(f) prohibition is engaged. This case was labelled high-risk in an earlier version of the corpus, which is how a benchmark can be at 100% and still be wrong.',
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
