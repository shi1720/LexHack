import { describe, expect, it } from 'vitest';
import { buildSnapshot } from '../src/ingest/snapshot.js';
import { scan } from '../src/scan.js';
import type { ScanReport, SystemProfile } from '../src/types.js';

/**
 * Article 6(3) — the provision most real Annex III conversations turn on.
 *
 * These tests exist because the feature shipped once as unreachable code:
 * `defaultProfile` whitelisted the fields it copied and quietly dropped the
 * claim, so three benchmark cases passed over a code path no user could
 * invoke. Every assertion below goes through `scan()` with an operator
 * profile, which is the only way a real caller reaches it.
 */

const SCREENER = {
  'package.json': JSON.stringify({ name: 'cv-router', dependencies: { 'scikit-learn': '^1.4.0' } }),
  'router.py': `from sklearn.ensemble import GradientBoostingClassifier

model = GradientBoostingClassifier()


def predict(features):
    return model.predict_proba(features)[:, 1]


def parse_resume(resume_text):
    """Extract structured fields from an applicant CV."""
    return {"skills": [], "years": 0}


def route_applicant(resume_text, candidate_id, job_requisition):
    """Place an applicant CV on the right requisition queue. No ranking."""
    parsed = parse_resume(resume_text)
    return {"job_requisition": job_requisition, "candidate_id": candidate_id, "applicant": True, "parsed": parsed}
`,
};

const PROFILING = {
  ...SCREENER,
  'profile.py': `def build_candidate_profile(resume_text):
    """User profile: segment the person and predict performance."""
    return {"segment_user": "senior", "predict_performance": 0.7, "user_profile": resume_text}
`,
};

function run(files: Record<string, string>, profile: Partial<SystemProfile> = {}): ScanReport {
  const snapshot = buildSnapshot({
    name: 'derogation',
    files: Object.entries(files).map(([path, bytes]) => ({ path, bytes })),
  });
  return scan(snapshot, { profile: { name: 'derogation', markets: ['eu'], ...profile } });
}

describe('Article 6(3) derogation', () => {
  it('classifies the screener as high-risk when no claim is made', () => {
    const report = run(SCREENER);
    expect(report.classification.tier).toBe('high');
    expect(report.classification.article6_3).toBeUndefined();
  });

  it('reaches the classifier from an operator profile, through scan()', () => {
    // The bug this test exists for: `defaultProfile` dropped the field, so the
    // whole feature was dead code behind a green benchmark.
    const report = run(SCREENER, { article6_3Derogation: 'narrow-procedural' });
    expect(report.classification.article6_3).toBeDefined();
    expect(report.classification.article6_3?.available).toBe(true);
    expect(report.classification.tier).not.toBe('high');
  });

  it('states both limbs of the test, not just the one the operator picked', () => {
    const { article6_3 } = run(SCREENER, { article6_3Derogation: 'preparatory' }).classification;
    expect(article6_3?.rationale).toMatch(/does not pose a significant risk of harm/);
    expect(article6_3?.rationale).toMatch(/Article 6\(4\)/);
    expect(article6_3?.rationale).toMatch(/Article 49\(2\)/);
  });

  it('refuses the derogation where the system profiles natural persons', () => {
    // Final subparagraph of Article 6(3): profiling closes it, whichever limb
    // is relied on.
    const report = run(PROFILING, { article6_3Derogation: 'narrow-procedural' });
    expect(report.classification.article6_3?.available).toBe(false);
    expect(report.classification.article6_3?.rationale).toMatch(/profiling/i);
    expect(report.classification.tier).toBe('high');
    expect(report.classification.article6_3?.evidence.length).toBeGreaterThan(0);
  });

  it('keeps Article 49 registration alive after a successful claim', () => {
    // Article 49(2) is the obligation that survives the derogation, and the
    // control used to hang off `whenHighRisk` — so claiming 6(3) switched off
    // the one duty it does not switch off, while the gap text said otherwise.
    const report = run(SCREENER, { article6_3Derogation: 'narrow-procedural' });
    const art49 = report.controls.find((c) => c.controlId === 'eu-ai-act.art49.registration');
    expect(art49?.status).not.toBe('not_applicable');
  });

  /**
   * The final subparagraph of Article 6(3) closes the derogation for any
   * system that performs profiling. It is the one limb a scanner can check,
   * and the detector could not see the two cases that matter most: a
   * `candidateScore` in a hiring tool, because the prefilter had no keyword
   * containing "score"; and a `probability_of_default` in a credit tool,
   * because "economic situation" was not in the pattern at all. A credit
   * scorer claiming the derogation is the single case the subparagraph most
   * obviously exists for.
   */
  it('closes on a candidate score, which is profiling', () => {
    // `candidateScore` is the line this project prints as its own example in
    // the README, the deck and the landing page — and the profiling detector
    // could not see it, because the keyword prefilter had no entry containing
    // "score" and the file never reached the line loop.
    const report = run(
      {
        ...SCREENER,
        'rank.py':
          'def rank_applicant(applicant, job_requisition):\n' +
          '    parsed_resume = parse_resume(applicant["cv"])\n' +
          '    candidate_score = predict(parsed_resume)\n' +
          '    return {"applicant": applicant["id"], "candidate_score": candidate_score}\n',
      },
      { article6_3Derogation: 'narrow-procedural' },
    );
    expect(report.classification.article6_3?.available).toBe(false);
    expect(report.classification.article6_3?.rationale).toMatch(/profiling/i);
  });

  it('closes on a probability of default, which evaluates an economic situation', () => {
    const report = run(
      {
        'requirements.txt': 'xgboost==2.1.0\n',
        'score.py':
          'def score_application(application):\n' +
          '    features = build_features(application)\n' +
          '    probability_of_default = float(_booster.predict(features)[0])\n' +
          '    return {"applicant": application["id"], "probability_of_default": probability_of_default}\n',
      },
      { article6_3Derogation: 'pattern-detection', tierOverride: 'high' },
    );
    expect(report.classification.article6_3?.available).toBe(false);
  });

  it('records that a claim had nothing to displace', () => {
    const report = run(
      { 'package.json': JSON.stringify({ name: 'wiki' }), 'search.py': 'def search(q):\n    return index.lookup(q)\n' },
      { article6_3Derogation: 'preparatory' },
    );
    expect(report.classification.article6_3?.available).toBe(false);
    expect(report.classification.article6_3?.rationale).toMatch(/nothing in this repository places the system in Annex III/);
  });
});
